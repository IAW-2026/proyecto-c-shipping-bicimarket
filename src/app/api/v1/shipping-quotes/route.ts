// POST /api/v1/shipping-quotes — SH1 (docs/03)
// Auth: S2S (X-Service-Token). Lo llama Buyer App durante el checkout.
//
// Desde ADR-005: el endpoint acepta siempre pickups[] (N>=1). Devuelve N
// cotizaciones agrupadas con descuento aplicado por la fórmula
// multiOriginDiscountFactor (0% para N=1, 5% por cada origen adicional
// hasta tope de 20%). Reemplaza el body viejo single-origen.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callServiceApi, requireServiceToken } from "@/lib/service-auth";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toQuoteResponseDTO } from "@/lib/dto";
import { createQuoteSchema } from "@/validation/shipping-quotes";
import { quoteMultiOriginSum } from "@/lib/quote-engine";
import { adaptPickupAddressApi } from "@/adapters/seller";
import type { SellerPickupAddressApi } from "@/types/external/seller";

const QUOTE_TTL_MS = 60 * 60 * 1000; // 60 min

async function fetchPickupAddress(sellerProfileId: string) {
  let res: Response;
  try {
    res = await callServiceApi(
      "seller",
      `/api/v1/seller-profile/${sellerProfileId}/pickup-address`,
    );
  } catch (err) {
    throw new ApiError(
      "UPSTREAM_ERROR",
      502,
      "No pudimos obtener la dirección de retiro del vendedor",
      { seller_profile_id: sellerProfileId, target: "seller", cause: String(err) },
    );
  }

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new ApiError(
      res.status === 404 ? "SELLER_PICKUP_ADDRESS_NOT_FOUND" : "UPSTREAM_ERROR",
      res.status === 404 ? 422 : 502,
      "No pudimos resolver la dirección de retiro del vendedor",
      {
        seller_profile_id: sellerProfileId,
        target: "seller",
        upstream_status: res.status,
        upstream_body: details,
      },
    );
  }

  const raw = (await res.json()) as SellerPickupAddressApi;
  return adaptPickupAddressApi(raw);
}

export async function POST(req: NextRequest) {
  try {
    const denied = requireServiceToken(req);
    if (denied) return denied;

    const body = createQuoteSchema.parse(await req.json());
    const idempotencyKey = req.headers.get("idempotency-key");

    // Idempotencia: las N quotes se persisten con idempotencyKey
    // `${K}:${idx}`. En POST repetido recuperamos por prefijo.
    if (idempotencyKey) {
      const existing = await prisma.shippingQuote.findMany({
        where: {
          idempotencyKey: { startsWith: `${idempotencyKey}:` },
        },
        orderBy: { idempotencyKey: "asc" },
      });
      if (existing.length > 0) {
        // Reconstruimos los totales desde lo que ya está persistido.
        const totalNet = existing.reduce((s, q) => s + q.costCents, 0);
        // No tenemos el gross persistido — devolvemos totalNet en ambos
        // campos. (En la práctica el cliente reintenta exactamente con la
        // misma key y le importa identidad, no el desglose gross/net.)
        return NextResponse.json(
          toQuoteResponseDTO({
            quotes: existing,
            originsCount: existing.length,
            discountPct: 0,
            totalGrossCents: totalNet,
            totalNetCents: totalNet,
          }),
        );
      }
    }

    const pickupAddresses = await Promise.all(
      body.pickups.map((p) => fetchPickupAddress(p.seller_profile_id)),
    );

    const pickupsResolved = body.pickups.map((p, idx) => {
      const address = pickupAddresses[idx];
      const weightGramsTotal = p.packages.reduce(
        (sum, pk) => sum + pk.weight_grams,
        0,
      );
      return {
        sellerProfileId: p.seller_profile_id,
        address,
        weightGramsTotal,
        packages: p.packages,
      };
    });

    const result = await quoteMultiOriginSum({
      pickups: pickupsResolved.map((p) => ({
        sellerProfileId: p.sellerProfileId,
        postalCode: p.address.postal_code,
        weightGramsTotal: p.weightGramsTotal,
      })),
      destinationPostalCode: body.to.postal_code,
      serviceLevel: body.service_level,
    });

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);

    const quotes = await prisma.$transaction(
      result.perOrigin.map((r, idx) =>
        prisma.shippingQuote.create({
          data: {
            id: generateId("qte"),
            sellerProfileId: r.sellerProfileId,
            fromAddressSnapshot: pickupsResolved[idx].address as unknown as object,
            toAddressSnapshot: body.to as unknown as object,
            serviceLevel: body.service_level,
            carrier: r.carrier,
            costCents: r.netCostCents,
            weightGramsTotal: pickupsResolved[idx].weightGramsTotal,
            packagesCount: pickupsResolved[idx].packages.length,
            packagesSnapshot: pickupsResolved[idx].packages as unknown as object,
            estimatedDaysMin: r.estimatedDaysMin,
            estimatedDaysMax: r.estimatedDaysMax,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}:${idx}` : null,
            expiresAt,
          },
        }),
      ),
    );

    return NextResponse.json(
      toQuoteResponseDTO({
        quotes,
        originsCount: result.originsCount,
        discountPct: result.discountPct,
        totalGrossCents: result.totalGrossCents,
        totalNetCents: result.totalNetCents,
      }),
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
