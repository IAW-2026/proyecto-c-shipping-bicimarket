// POST /api/v1/shipping-quotes — SH1 (docs/03)
// Auth: S2S (X-Service-Token). Lo llama Buyer App durante el checkout.
//
// Usa el quote-engine que matchea (distancia × peso × service_level)
// contra `shipping_rates`. La distancia se calcula con Haversine sobre
// los CPs origen y destino (ver src/lib/geo/).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { getMockPickupAddress } from "@/lib/mocks";
import { toShippingQuoteDTO } from "@/lib/dto";
import { createQuoteSchema } from "@/validation/shipping-quotes";
import { findMatchingRate } from "@/lib/quote-engine";

const QUOTE_TTL_MS = 60 * 60 * 1000; // 60 min

export async function POST(req: NextRequest) {
  try {
    const denied = requireServiceToken(req);
    if (denied) return denied;

    const body = createQuoteSchema.parse(await req.json());
    const idempotencyKey = req.headers.get("idempotency-key");

    if (idempotencyKey) {
      const existing = await prisma.shippingQuote.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return NextResponse.json(toShippingQuoteDTO(existing));
    }

    // Sprint 1 / ADR-002: pickup_address mockeada
    const pickupAddress = getMockPickupAddress(body.from.seller_profile_id);

    const weightGramsTotal = body.packages.reduce(
      (sum, p) => sum + p.weight_grams,
      0,
    );

    // Motor de matching: si los CPs no están en el dataset tira 422
    // POSTAL_CODE_UNKNOWN; si no hay rate para esa combinación devuelve null.
    const matched = await findMatchingRate({
      pickupPostalCode: pickupAddress.postal_code,
      shippingPostalCode: body.to.postal_code,
      weightGramsTotal,
      serviceLevel: body.service_level,
    });

    if (!matched) {
      throw new ApiError(
        "RATE_NOT_FOUND",
        422,
        "No hay tarifa disponible para esos parámetros",
        {
          weight_grams_total: weightGramsTotal,
          service_level: body.service_level,
        },
      );
    }

    const quote = await prisma.shippingQuote.create({
      data: {
        id: generateId("qte"),
        sellerProfileId: body.from.seller_profile_id,
        fromAddressSnapshot: pickupAddress as unknown as object,
        toAddressSnapshot: body.to as unknown as object,
        serviceLevel: body.service_level,
        carrier: matched.carrier,
        costCents: matched.costCents,
        weightGramsTotal,
        packagesCount: body.packages.length,
        packagesSnapshot: body.packages as unknown as object,
        estimatedDaysMin: matched.estimatedDaysMin,
        estimatedDaysMax: matched.estimatedDaysMax,
        idempotencyKey: idempotencyKey ?? null,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
      },
    });

    return NextResponse.json(toShippingQuoteDTO(quote), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
