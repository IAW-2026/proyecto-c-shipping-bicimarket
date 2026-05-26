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
