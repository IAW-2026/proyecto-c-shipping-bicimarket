// POST /api/v1/admin/shipments — DEV-ONLY (JWT admin)
//
// Endpoint para crear envíos manualmente desde la UI de admin. NO existe en
// la API contractual (docs/03 dice que los shipments los crea Seller App
// via S2S con POST /api/v1/shipments + un shipping_quote_id válido).
//
// Acá generamos quote + shipment + packages + tracking_events iniciales en
// una transacción, con IDs opacos (`ord_…`, `osg_…`, `sor_…`) autogenerados
// para no requerir que el admin los conozca. Esto rompe la regla de "Seller
// es dueño del sales_order_id" — está bien porque es solo para probar el
// flujo en dev.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId, generateTrackingNumber } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentDTO } from "@/lib/dto";
import { findMatchingRate } from "@/lib/quote-engine";
import {
  ServiceLevel,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
} from "@/generated/prisma/client";

const bodySchema = z.object({
  seller_profile_id: z.string().min(1),
  buyer_profile_id: z.string().min(1),
  buyer_name: z.string().min(1).optional(),
  service_level: z.enum(["standard", "express", "same_day"]),
  pickup_address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(2).default("AR"),
  }),
  shipping_address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    apartment: z.string().optional(),
    city: z.string().min(1),
    province: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(2).default("AR"),
  }),
  packages: z
    .array(
      z.object({
        weight_grams: z.number().int().positive(),
        length_cm: z.number().int().positive(),
        width_cm: z.number().int().positive(),
        height_cm: z.number().int().positive(),
        description: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = bodySchema.parse(await req.json());
    const weightTotal = body.packages.reduce(
      (sum, p) => sum + p.weight_grams,
      0,
    );

    // Motor de matching: si los CPs no están en el dataset tira 422
    // POSTAL_CODE_UNKNOWN (lo maneja handleApiError abajo).
    // Si los CPs están pero no hay rate para la combinación, fallback dev.
    const matched = await findMatchingRate({
      pickupPostalCode: body.pickup_address.postal_code,
      shippingPostalCode: body.shipping_address.postal_code,
      weightGramsTotal: weightTotal,
      serviceLevel: body.service_level as ServiceLevel,
    });

    const costCents = matched?.costCents ?? 500_000 + weightTotal * 30;
    const carrier = matched?.carrier ?? "andreani";
    const estimatedDaysMin = matched?.estimatedDaysMin ?? 3;
    const estimatedDaysMax = matched?.estimatedDaysMax ?? 5;

    const shipmentId = generateId("shp");
    const quoteId = generateId("qte");
    const orderId = generateId("ord");
    const orderSellerGroupId = generateId("osg");
    const salesOrderId = generateId("sor");
    const trackingNumber = generateTrackingNumber();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const shippingAddressSnapshot = {
      ...body.shipping_address,
      country: body.shipping_address.country || "AR",
      ...(body.buyer_name && { receiver_name: body.buyer_name }),
    };
    const pickupAddressSnapshot = {
      ...body.pickup_address,
      country: body.pickup_address.country || "AR",
    };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear quote (snapshot)
      await tx.shippingQuote.create({
        data: {
          id: quoteId,
          sellerProfileId: body.seller_profile_id,
          fromAddressSnapshot: pickupAddressSnapshot as object,
          toAddressSnapshot: shippingAddressSnapshot as object,
          serviceLevel: body.service_level as ServiceLevel,
          carrier,
          costCents,
          weightGramsTotal: weightTotal,
          packagesCount: body.packages.length,
          packagesSnapshot: body.packages as unknown as object,
          estimatedDaysMin,
          estimatedDaysMax,
          expiresAt,
        },
      });

      // 2. Crear shipment con status=ready_for_pickup
      const shipment = await tx.shipment.create({
        data: {
          id: shipmentId,
          orderId,
          orderSellerGroupId,
          salesOrderId,
          sellerProfileId: body.seller_profile_id,
          buyerProfileId: body.buyer_profile_id,
          shippingQuoteId: quoteId,
          carrier,
          serviceLevel: body.service_level as ServiceLevel,
          trackingNumber,
          labelUrl: "/labels/sample.pdf",
          status: ShipmentStatus.ready_for_pickup,
          weightGramsTotal: weightTotal,
          costCents,
          shippingAddressSnapshot: shippingAddressSnapshot as unknown as object,
          pickupAddressSnapshot: pickupAddressSnapshot as unknown as object,
        },
      });

      // 3. Packages
      const packages = await Promise.all(
        body.packages.map((p) =>
          tx.package.create({
            data: {
              id: generateId("pkg"),
              shipmentId: shipment.id,
              weightGrams: p.weight_grams,
              lengthCm: p.length_cm,
              widthCm: p.width_cm,
              heightCm: p.height_cm,
              description: p.description ?? null,
            },
          }),
        ),
      );

      // 4. Tracking events iniciales (created + ready_for_pickup)
      await tx.trackingEvent.createMany({
        data: [
          {
            id: generateId("evt"),
            shipmentId: shipment.id,
            eventType: TrackingEventType.created,
            occurredAt: now,
          },
          {
            id: generateId("evt"),
            shipmentId: shipment.id,
            eventType: TrackingEventType.ready_for_pickup,
            occurredAt: now,
          },
        ],
      });

      // 5. Audit history
      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId: shipment.id,
          fromStatus: ShipmentStatus.created,
          toStatus: ShipmentStatus.ready_for_pickup,
          source: StatusHistorySource.admin,
          payload: { reason: "Creado manualmente desde /admin/shipments/new" },
          occurredAt: now,
        },
      });

      return { shipment, packages };
    });

    return NextResponse.json(
      toShipmentDTO(result.shipment, result.packages),
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
