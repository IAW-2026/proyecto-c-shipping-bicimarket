// POST /api/v1/shipping-quotes - SH1 (docs/03)
// Auth: S2S (X-Service-Token). Lo llama Buyer App durante el checkout.
//
// Desde ADR-005: el endpoint acepta siempre pickups[] (N>=1). Devuelve N
// cotizaciones agrupadas con descuento aplicado por la formula
// multiOriginDiscountFactor (0% para N=1, 5% por cada origen adicional
// hasta tope de 20%). Reemplaza el body viejo single-origen.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { generateId } from "@/lib/ids";
import { handleApiError } from "@/lib/api-error";
import { toQuoteResponseDTO } from "@/lib/dto";
import { createQuoteSchema } from "@/validation/shipping-quotes";
import { quoteMultiOriginSum } from "@/lib/quote-engine";
import { logger } from "@/lib/logger";
import { fetchSellerPickupAddress } from "@/lib/seller-pickup";

const QUOTE_TTL_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    logger.info({
      msg: "shipping-quotes.request.received",
      requestId,
      has_service_token: Boolean(req.headers.get("x-service-token")),
      idempotency_key: req.headers.get("idempotency-key"),
    });

    const denied = requireServiceToken(req);
    if (denied) {
      logger.warn({
        msg: "shipping-quotes.request.denied",
        requestId,
        reason: "service-token",
      });
      return denied;
    }

    const body = createQuoteSchema.parse(await req.json());
    const idempotencyKey = req.headers.get("idempotency-key");

    logger.info({
      msg: "shipping-quotes.request.parsed",
      requestId,
      origins_count: body.pickups.length,
      destination_postal_code: body.to.postal_code,
      service_level: body.service_level,
      seller_profile_ids: body.pickups.map((p) => p.seller_profile_id),
    });

    if (idempotencyKey) {
      const existing = await prisma.shippingQuote.findMany({
        where: {
          idempotencyKey: { startsWith: `${idempotencyKey}:` },
        },
        orderBy: { idempotencyKey: "asc" },
      });

      if (existing.length > 0) {
        logger.info({
          msg: "shipping-quotes.idempotency.hit",
          requestId,
          idempotency_key: idempotencyKey,
          quotes_found: existing.length,
        });

        const totalNet = existing.reduce((sum, quote) => sum + quote.costCents, 0);
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
      body.pickups.map((pickup) =>
        fetchSellerPickupAddress(pickup.seller_profile_id, requestId),
      ),
    );

    const pickupsResolved = body.pickups.map((pickup, idx) => {
      const address = pickupAddresses[idx];
      const weightGramsTotal = pickup.packages.reduce(
        (sum, pkg) => sum + pkg.weight_grams,
        0,
      );
      return {
        sellerProfileId: pickup.seller_profile_id,
        address,
        weightGramsTotal,
        packages: pickup.packages,
      };
    });

    logger.info({
      msg: "shipping-quotes.pickups.resolved",
      requestId,
      pickups: pickupsResolved.map((pickup) => ({
        seller_profile_id: pickup.sellerProfileId,
        pickup_postal_code: pickup.address.postal_code,
        weight_grams_total: pickup.weightGramsTotal,
        packages_count: pickup.packages.length,
      })),
    });

    const result = await quoteMultiOriginSum({
      pickups: pickupsResolved.map((pickup) => ({
        sellerProfileId: pickup.sellerProfileId,
        postalCode: pickup.address.postal_code,
        weightGramsTotal: pickup.weightGramsTotal,
      })),
      destinationPostalCode: body.to.postal_code,
      serviceLevel: body.service_level,
    });

    logger.info({
      msg: "shipping-quotes.engine.success",
      requestId,
      origins_count: result.originsCount,
      discount_pct: result.discountPct,
      total_gross_cents: result.totalGrossCents,
      total_net_cents: result.totalNetCents,
      per_origin: result.perOrigin.map((origin) => ({
        seller_profile_id: origin.sellerProfileId,
        carrier: origin.carrier,
        net_cost_cents: origin.netCostCents,
        estimated_days_min: origin.estimatedDaysMin,
        estimated_days_max: origin.estimatedDaysMax,
      })),
    });

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);

    const quotes = await prisma.$transaction(
      result.perOrigin.map((origin, idx) =>
        prisma.shippingQuote.create({
          data: {
            id: generateId("qte"),
            sellerProfileId: origin.sellerProfileId,
            fromAddressSnapshot: pickupsResolved[idx].address as unknown as object,
            toAddressSnapshot: body.to as unknown as object,
            serviceLevel: body.service_level,
            carrier: origin.carrier,
            costCents: origin.netCostCents,
            weightGramsTotal: pickupsResolved[idx].weightGramsTotal,
            packagesCount: pickupsResolved[idx].packages.length,
            packagesSnapshot: pickupsResolved[idx].packages as unknown as object,
            estimatedDaysMin: origin.estimatedDaysMin,
            estimatedDaysMax: origin.estimatedDaysMax,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}:${idx}` : null,
            expiresAt,
          },
        }),
      ),
    );

    logger.info({
      msg: "shipping-quotes.persist.success",
      requestId,
      quotes_created: quotes.length,
      quote_ids: quotes.map((quote) => quote.id),
    });

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
    logger.error({
      msg: "shipping-quotes.request.failed",
      requestId,
      error:
        err instanceof Error
          ? { name: err.name, message: err.message }
          : String(err),
    });
    return handleApiError(err);
  }
}
