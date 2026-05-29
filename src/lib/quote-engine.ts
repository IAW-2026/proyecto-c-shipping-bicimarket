// Motor de cotizaciones. Único punto de verdad para "dado origen, destino,
// peso y service_level, ¿qué tarifa aplica?". Se usa desde:
//   - POST /api/v1/shipping-quotes (cotización para Buyer)
//   - POST /api/v1/admin/shipments (autocompletar costo en alta manual)
//
// Si alguno de los CPs no está en el dataset (`ar-postal-codes.ts`), tira
// 422 POSTAL_CODE_UNKNOWN. NO hay fallback default — decisión del proyecto
// para evitar cobros incorrectos por estimaciones malas.

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { geocodePostalCode } from "@/lib/geo/ar-postal-codes";
import { bestRoute } from "@/lib/geo/route";
import { multiOriginDiscountFactor } from "@/lib/multi-origin-discount";
import type { ShippingRate } from "@/generated/prisma/client";
import type { ServiceLevel } from "@/types/shipments";

export interface QuoteInput {
  pickupPostalCode: string;
  shippingPostalCode: string;
  weightGramsTotal: number;
  serviceLevel: ServiceLevel;
}

export interface QuoteResult {
  rate: ShippingRate;
  distanceKm: number;
  costCents: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrier: string;
}

/**
 * Busca la tarifa que matchea (distancia × peso × service_level).
 *
 *  - 422 POSTAL_CODE_UNKNOWN si alguno de los CPs no está en el dataset.
 *  - null si no hay tarifa configurada para esa combinación (el caller
 *    decide si devuelve 422 NO_RATE_AVAILABLE o falla con default).
 */
export async function findMatchingRate(
  input: QuoteInput,
): Promise<QuoteResult | null> {
  const distanceKm = distanceBetweenPostalCodes(
    input.pickupPostalCode,
    input.shippingPostalCode,
  );
  if (distanceKm === null) {
    throw new ApiError(
      "POSTAL_CODE_UNKNOWN",
      422,
      "No contamos con envíos al destino que ingresaste.",
      {
        pickup_postal_code: input.pickupPostalCode,
        shipping_postal_code: input.shippingPostalCode,
      },
    );
  }

  const rate = await prisma.shippingRate.findFirst({
    where: {
      active: true,
      serviceLevel: input.serviceLevel,
      distanceKmMin: { lte: distanceKm },
      distanceKmMax: { gte: distanceKm },
      weightGramsMin: { lte: input.weightGramsTotal },
      weightGramsMax: { gte: input.weightGramsTotal },
    },
    orderBy: [{ costCents: "asc" }],
  });

  if (!rate) return null;

  return {
    rate,
    distanceKm,
    costCents: rate.costCents,
    estimatedDaysMin: rate.estimatedDaysMin,
    estimatedDaysMax: rate.estimatedDaysMax,
    carrier: rate.carrier,
  };
}

export interface MultiPickupQuoteInput {
  pickupPostalCodes: string[];
  destinationPostalCode: string;
  weightGramsTotal: number;
  serviceLevel: ServiceLevel;
}

export interface MultiPickupQuoteResult {
  rate: ShippingRate | null; // null si caemos al fallback de dev (sin rate matching)
  totalDistanceKm: number;
  orderedSequence: number[]; // índices de pickups en orden óptimo
  costCents: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrier: string;
}

/**
 * Cotiza una ruta multi-pickup: resuelve la ruta más corta que recorre todos
 * los `pickups` y termina en el destino, después matchea un rate por (distancia
 * total × peso total × service_level).
 *
 *  - 422 POSTAL_CODE_UNKNOWN si cualquier CP no está en el dataset
 *    (details incluye `pickup_index` cuando es uno de los pickups).
 *  - Si no hay rate configurada, devuelve null en `rate` y aplica el fallback
 *    dev del caller (mismo patrón que findMatchingRate).
 */
export async function quoteMultiPickupRoute(
  input: MultiPickupQuoteInput,
): Promise<MultiPickupQuoteResult> {
  // 1. Geocodificar todos los CPs y validar cobertura.
  const pickupPoints = input.pickupPostalCodes.map((cp, idx) => {
    const entry = geocodePostalCode(cp);
    if (!entry) {
      throw new ApiError(
        "POSTAL_CODE_UNKNOWN",
        422,
        "No contamos con envíos desde uno de los orígenes que ingresaste.",
        { pickup_index: idx, postal_code: cp },
      );
    }
    return { lat: entry.lat, lng: entry.lng };
  });
  const destEntry = geocodePostalCode(input.destinationPostalCode);
  if (!destEntry) {
    throw new ApiError(
      "POSTAL_CODE_UNKNOWN",
      422,
      "No contamos con envíos al destino que ingresaste.",
      { destination_postal_code: input.destinationPostalCode },
    );
  }

  // 2. Resolver ruta óptima (km totales + orden de visita).
  const route = bestRoute(pickupPoints, {
    lat: destEntry.lat,
    lng: destEntry.lng,
  });

  // 3. Match de rate por (distancia total × peso total × service_level).
  const rate = await prisma.shippingRate.findFirst({
    where: {
      active: true,
      serviceLevel: input.serviceLevel,
      distanceKmMin: { lte: route.totalKm },
      distanceKmMax: { gte: route.totalKm },
      weightGramsMin: { lte: input.weightGramsTotal },
      weightGramsMax: { gte: input.weightGramsTotal },
    },
    orderBy: [{ costCents: "asc" }],
  });

  if (!rate) {
    return {
      rate: null,
      totalDistanceKm: route.totalKm,
      orderedSequence: route.orderedSequence,
      costCents: 0,
      estimatedDaysMin: 0,
      estimatedDaysMax: 0,
      carrier: "",
    };
  }

  return {
    rate,
    totalDistanceKm: route.totalKm,
    orderedSequence: route.orderedSequence,
    costCents: rate.costCents,
    estimatedDaysMin: rate.estimatedDaysMin,
    estimatedDaysMax: rate.estimatedDaysMax,
    carrier: rate.carrier,
  };
}

// ─── Multi-origin sum (ADR-005) ────────────────────────────────────────────
// Costeo "suma de tramos" para órdenes multi-vendedor. Por cada origen:
// `findMatchingRate(origen_i → destino, peso_i, service_level)`. Después se
// suma todo y se aplica un descuento `min(0.20, 0.05 * (N-1))` proporcional
// a cada tramo. El último origen absorbe el redondeo para que
// SUM(netCostCents) === totalNetCents exacto.
//
// Reemplaza el costeo viejo de quoteMultiPickupRoute (TSP + un solo rate)
// que subcotizaba envíos con orígenes dispersos.

export interface MultiOriginPickupInput {
  sellerProfileId: string;
  postalCode: string;
  weightGramsTotal: number;
}

export interface MultiOriginPerOrigin {
  sellerProfileId: string;
  rate: ShippingRate;
  distanceKm: number;
  grossCostCents: number;
  netCostCents: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrier: string;
}

export interface MultiOriginSumResult {
  perOrigin: MultiOriginPerOrigin[];
  originsCount: number;
  discountPct: number;
  totalGrossCents: number;
  totalNetCents: number;
}

export async function quoteMultiOriginSum(input: {
  pickups: MultiOriginPickupInput[];
  destinationPostalCode: string;
  serviceLevel: ServiceLevel;
}): Promise<MultiOriginSumResult> {
  if (input.pickups.length === 0) {
    throw new ApiError(
      "BAD_REQUEST",
      400,
      "Se requiere al menos un pickup para cotizar",
    );
  }

  const perOriginRaw = await Promise.all(
    input.pickups.map(async (pickup) => {
      const matched = await findMatchingRate({
        pickupPostalCode: pickup.postalCode,
        shippingPostalCode: input.destinationPostalCode,
        weightGramsTotal: pickup.weightGramsTotal,
        serviceLevel: input.serviceLevel,
      });
      if (!matched) {
        throw new ApiError(
          "RATE_NOT_FOUND",
          422,
          "No hay tarifa disponible para uno de los orígenes",
          {
            seller_profile_id: pickup.sellerProfileId,
            postal_code: pickup.postalCode,
            weight_grams_total: pickup.weightGramsTotal,
            service_level: input.serviceLevel,
          },
        );
      }
      return { pickup, matched };
    }),
  );

  const originsCount = perOriginRaw.length;
  const discountPct = multiOriginDiscountFactor(originsCount);
  const factor = 1 - discountPct;

  const totalGrossCents = perOriginRaw.reduce(
    (sum, { matched }) => sum + matched.costCents,
    0,
  );
  const totalNetCents = Math.floor(totalGrossCents * factor);

  // Aplicar descuento por tramo con redondeo absorbido por el último origen
  // para que SUM(netCostCents) === totalNetCents (mismo patrón que
  // admin/shipments/route.ts:101-116).
  let runningNet = 0;
  const perOrigin: MultiOriginPerOrigin[] = perOriginRaw.map(
    ({ pickup, matched }, idx) => {
      const gross = matched.costCents;
      const isLast = idx === originsCount - 1;
      const net = isLast
        ? totalNetCents - runningNet
        : Math.floor(gross * factor);
      runningNet += net;
      return {
        sellerProfileId: pickup.sellerProfileId,
        rate: matched.rate,
        distanceKm: matched.distanceKm,
        grossCostCents: gross,
        netCostCents: net,
        estimatedDaysMin: matched.estimatedDaysMin,
        estimatedDaysMax: matched.estimatedDaysMax,
        carrier: matched.carrier,
      };
    },
  );

  return {
    perOrigin,
    originsCount,
    discountPct,
    totalGrossCents,
    totalNetCents,
  };
}
