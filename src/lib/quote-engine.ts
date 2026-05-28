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
