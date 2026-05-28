// POST /api/v1/admin/shipments — DEV-ONLY (JWT admin)
//
// Crea un pedido multi-origen: N shipments compartiendo orderId, cada uno con
// su propio seller / pickup / paquetes. El service_level y el destino son
// únicos por pedido (la ruta también lo es).
//
// La quote se calcula sobre la ruta optimizada (visita de todos los pickups
// + destino, recorrido mínimo). El costo total se reparte entre los N
// shipments proporcional al peso. Si cualquier CP es desconocido o falta rate
// para el rango, se aborta TODO (no hay pedidos a medias).
//
// Endpoint dev, no contractual — Seller App es quien crea shipments en prod
// vía S2S con shipping_quote_id (docs/03 §SH2).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId, generateTrackingNumber } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentDTO } from "@/lib/dto";
import { quoteMultiPickupRoute } from "@/lib/quote-engine";
import {
  ServiceLevel,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
} from "@/generated/prisma/client";
import type { CreateAdminShipmentResponse } from "@/types/admin-shipments";

const addressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  apartment: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().min(2).max(2).default("AR"),
});

const packageSchema = z.object({
  weight_grams: z.number().int().positive(),
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
  description: z.string().optional(),
});

const bodySchema = z.object({
  buyer_profile_id: z.string().min(1),
  buyer_name: z.string().min(1).optional(),
  service_level: z.enum(["standard", "express", "same_day"]),
  shipping_address: addressSchema,
  pickups: z
    .array(
      z.object({
        seller_profile_id: z.string().min(1),
        pickup_address: addressSchema,
        packages: z.array(packageSchema).min(1),
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
    const serviceLevel = body.service_level as ServiceLevel;

    // Peso total del pedido (todos los paquetes de todos los pickups).
    const weightTotal = body.pickups.reduce(
      (sum, p) => sum + p.packages.reduce((s, pkg) => s + pkg.weight_grams, 0),
      0,
    );

    // Cotización con ruta óptima. Si algún CP es desconocido tira 422 y se
    // propaga via handleApiError abajo (con pickup_index en details).
    const quote = await quoteMultiPickupRoute({
      pickupPostalCodes: body.pickups.map((p) => p.pickup_address.postal_code),
      destinationPostalCode: body.shipping_address.postal_code,
      weightGramsTotal: weightTotal,
      serviceLevel,
    });

    // Si no hay rate matcheada, fallback dev (mismo patrón que el endpoint
    // original single-pickup).
    const totalCostCents =
      quote.rate !== null
        ? quote.costCents
        : 500_000 + weightTotal * 30;
    const carrier = quote.rate?.carrier ?? "andreani";
    const estimatedDaysMin = quote.rate?.estimatedDaysMin ?? 3;
    const estimatedDaysMax = quote.rate?.estimatedDaysMax ?? 5;

    // Repartir costo proporcional al peso. El último shipment absorbe la
    // diferencia de redondeo para que la suma cierre exacta.
    const pickupWeights = body.pickups.map((p) =>
      p.packages.reduce((s, pkg) => s + pkg.weight_grams, 0),
    );
    const pickupCosts: number[] = [];
    let assignedCost = 0;
    for (let i = 0; i < body.pickups.length; i++) {
      if (i === body.pickups.length - 1) {
        pickupCosts.push(totalCostCents - assignedCost);
      } else {
        const c = Math.round((totalCostCents * pickupWeights[i]) / weightTotal);
        pickupCosts.push(c);
        assignedCost += c;
      }
    }

    const orderId = generateId("ord");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const shippingAddressSnapshot = {
      ...body.shipping_address,
      country: body.shipping_address.country || "AR",
      ...(body.buyer_name && { receiver_name: body.buyer_name }),
    };

    const result = await prisma.$transaction(
      async (tx) => {
        const created: Array<{
          shipment: Awaited<ReturnType<typeof tx.shipment.create>>;
          packages: Array<Awaited<ReturnType<typeof tx.package.create>>>;
        }> = [];

      for (let i = 0; i < body.pickups.length; i++) {
        const pickup = body.pickups[i];
        const pickupAddressSnapshot = {
          ...pickup.pickup_address,
          country: pickup.pickup_address.country || "AR",
        };
        const shipmentId = generateId("shp");
        const quoteId = generateId("qte");
        const orderSellerGroupId = generateId("osg");
        const salesOrderId = generateId("sor");
        const trackingNumber = generateTrackingNumber();

        // 1. Quote snapshot por shipment (refleja origen específico + costo
        //    asignado a este shipment, no el total).
        await tx.shippingQuote.create({
          data: {
            id: quoteId,
            sellerProfileId: pickup.seller_profile_id,
            fromAddressSnapshot: pickupAddressSnapshot as object,
            toAddressSnapshot: shippingAddressSnapshot as object,
            serviceLevel,
            carrier,
            costCents: pickupCosts[i],
            weightGramsTotal: pickupWeights[i],
            packagesCount: pickup.packages.length,
            packagesSnapshot: pickup.packages as unknown as object,
            estimatedDaysMin,
            estimatedDaysMax,
            expiresAt,
          },
        });

        // 2. Shipment
        const shipment = await tx.shipment.create({
          data: {
            id: shipmentId,
            orderId,
            orderSellerGroupId,
            salesOrderId,
            sellerProfileId: pickup.seller_profile_id,
            buyerProfileId: body.buyer_profile_id,
            shippingQuoteId: quoteId,
            carrier,
            serviceLevel,
            trackingNumber,
            labelUrl: "/labels/sample.pdf",
            status: ShipmentStatus.ready_for_pickup,
            weightGramsTotal: pickupWeights[i],
            costCents: pickupCosts[i],
            shippingAddressSnapshot: shippingAddressSnapshot as unknown as object,
            pickupAddressSnapshot: pickupAddressSnapshot as unknown as object,
          },
        });

        // 3. Packages
        const packages = await Promise.all(
          pickup.packages.map((p) =>
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

        // 4. Tracking events iniciales
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

        // 5. Audit con order_id + posición en la ruta
        await tx.shipmentStatusHistory.create({
          data: {
            id: generateId("ssh"),
            shipmentId: shipment.id,
            fromStatus: ShipmentStatus.created,
            toStatus: ShipmentStatus.ready_for_pickup,
            source: StatusHistorySource.admin,
            payload: {
              reason: "Creado manualmente desde /admin/shipments/new",
              order_id: orderId,
              route_total_km: quote.totalDistanceKm,
              sequence_index: quote.orderedSequence.indexOf(i),
            },
            occurredAt: now,
          },
        });

        created.push({ shipment, packages });
      }

      return created;
      },
      {
        // Con N pickups (cada uno ~5 queries secuenciales) + latencia a Supabase
        // pgbouncer, el default de 5s se queda corto. 30s da margen para N ≤ 8
        // sin riesgo de timeout (P2028). maxWait también extendido para que la
        // tx no abortee si el pool tarda en darnos conexión.
        timeout: 30_000,
        maxWait: 10_000,
      },
    );

    const response: CreateAdminShipmentResponse = {
      order_id: orderId,
      total_distance_km: quote.totalDistanceKm,
      ordered_sequence: quote.orderedSequence,
      total_cost_cents: totalCostCents,
      shipments: result.map((r) => toShipmentDTO(r.shipment, r.packages)),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
