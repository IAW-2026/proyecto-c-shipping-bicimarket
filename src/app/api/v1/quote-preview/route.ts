// GET /api/v1/quote-preview — calcula el costo de un envío sin persistir
// nada. Pensado para que otras apps (Buyer típicamente) muestren el precio
// estimado en tiempo real mientras el usuario edita el carrito.
//
// Auth: S2S (X-Service-Token).
// Query params:
//   - pickup_postal_code   (ej "C1406")
//   - shipping_postal_code (ej "X5000")
//   - weight_grams         (suma total de los paquetes)
//   - service_level        ("standard" | "express" | "same_day")
//
// Respuestas:
//   200 → { cost_cents, currency, carrier, service_level, distance_km, ... }
//   400 BAD_REQUEST       → faltan o son inválidos los params
//   401 UNAUTHORIZED      → token inválido
//   422 POSTAL_CODE_UNKNOWN → algún CP no está en el dataset
//   422 RATE_NOT_FOUND    → no hay tarifa configurada para esa combinación
//
// Si la cotización va a derivar en un shipment, usar POST /shipping-quotes
// (persiste con TTL 60min y devuelve quote_id).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServiceToken } from "@/lib/service-auth";
import { ApiError, handleApiError } from "@/lib/api-error";
import { findMatchingRate } from "@/lib/quote-engine";
import type { QuotePreviewDTO } from "@/types/quote-preview";

const querySchema = z.object({
  pickup_postal_code: z.string().min(1),
  shipping_postal_code: z.string().min(1),
  weight_grams: z.coerce.number().int().positive(),
  service_level: z.enum(["standard", "express", "same_day"]),
});

export async function GET(req: NextRequest) {
  try {
    const denied = requireServiceToken(req);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      pickup_postal_code: searchParams.get("pickup_postal_code"),
      shipping_postal_code: searchParams.get("shipping_postal_code"),
      weight_grams: searchParams.get("weight_grams"),
      service_level: searchParams.get("service_level"),
    });
    if (!parsed.success) {
      throw new ApiError(
        "BAD_REQUEST",
        400,
        "Query params inválidos. Requeridos: pickup_postal_code, shipping_postal_code, weight_grams, service_level",
        { issues: parsed.error.issues },
      );
    }

    const matched = await findMatchingRate({
      pickupPostalCode: parsed.data.pickup_postal_code,
      shippingPostalCode: parsed.data.shipping_postal_code,
      weightGramsTotal: parsed.data.weight_grams,
      serviceLevel: parsed.data.service_level,
    });

    if (!matched) {
      throw new ApiError(
        "RATE_NOT_FOUND",
        422,
        "No hay tarifa disponible para esos parámetros",
        {
          weight_grams: parsed.data.weight_grams,
          service_level: parsed.data.service_level,
        },
      );
    }

    const dto: QuotePreviewDTO = {
      cost_cents: matched.costCents,
      currency: "ARS",
      carrier: matched.carrier,
      service_level: parsed.data.service_level,
      distance_km: matched.distanceKm,
      weight_grams_total: parsed.data.weight_grams,
      estimated_days_min: matched.estimatedDaysMin,
      estimated_days_max: matched.estimatedDaysMax,
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
