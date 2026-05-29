// POST /api/v1/shipments/{shipmentId}/retry
// Crea un nuevo shipment como copia del original que falló. Pensado para
// el caso "el operador no pudo entregar; queremos reintentar con otro
// envío disponible para que cualquier operador lo tome".
//
// Auth: operador activo o admin.
// Precondición: el shipment original debe estar en `failed_delivery`.
//
// Side effects (en una transacción):
//   - Nuevo shipment (status=ready_for_pickup, nuevo tracking_number, nuevos IDs)
//   - Copia los packages
//   - Crea nueva shipping_quote (snapshot inmutable)
//   - Crea 2 tracking_events iniciales (created + ready_for_pickup)
//   - Crea status_history del nuevo con payload { retry_of: <original_id> }
//   - Marca el original como `returned` (failed_delivery → returned es válida)
//   - Status_history del original con payload { retried_as: <new_id> }
//   - Cierra el assignment activo del original (status=cancelled)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  getActiveOperator,
  requireAdmin,
} from "@/lib/auth-helpers";
import { generateId, generateTrackingNumber } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentDTO } from "@/lib/dto";
import { recomputeGroupStatus } from "@/lib/group-status";
import {
  AssignmentStatus,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
} from "@/generated/prisma/client";
import { logger } from "@/lib/logger";

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");

    const admin = await requireAdmin(sessionClaims);
    if (!admin) {
      const operator = await getActiveOperator();
      if (!operator) {
        throw new ApiError(
          "FORBIDDEN",
          403,
          "Admin u operador activo requerido",
        );
      }
    }

    const source = admin
      ? StatusHistorySource.admin
      : StatusHistorySource.logistics;

    const original = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { packages: true, group: { select: { trackingNumber: true } } },
    });
    if (!original) {
      throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");
    }

    if (original.status !== ShipmentStatus.failed_delivery) {
      throw new ApiError(
        "INVALID_RETRY_STATE",
        409,
        "Solo se pueden reintentar envíos en estado 'failed_delivery'",
        { current_status: original.status },
      );
    }

    const newShipmentId = generateId("shp");
    const newQuoteId = generateId("qte");
    const newTrackingNumber = generateTrackingNumber();
    const now = new Date();
    const quoteExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Nueva shipping_quote (snapshot inmutable de la original)
      await tx.shippingQuote.create({
        data: {
          id: newQuoteId,
          sellerProfileId: original.sellerProfileId,
          fromAddressSnapshot: original.pickupAddressSnapshot as object,
          toAddressSnapshot: original.shippingAddressSnapshot as object,
          serviceLevel: original.serviceLevel,
          carrier: original.carrier,
          costCents: original.costCents,
          weightGramsTotal: original.weightGramsTotal,
          packagesCount: original.packages.length,
          packagesSnapshot: original.packages.map((p) => ({
            weight_grams: p.weightGrams,
            length_cm: p.lengthCm,
            width_cm: p.widthCm,
            height_cm: p.heightCm,
          })) as unknown as object,
          estimatedDaysMin: 1,
          estimatedDaysMax: 5,
          expiresAt: quoteExpiresAt,
          createdAt: now,
        },
      });

      // 2. Nuevo shipment (en ready_for_pickup, sin assignment)
      const newShipment = await tx.shipment.create({
        data: {
          id: newShipmentId,
          orderId: original.orderId,
          orderSellerGroupId: original.orderSellerGroupId,
          salesOrderId: original.salesOrderId,
          sellerProfileId: original.sellerProfileId,
          buyerProfileId: original.buyerProfileId,
          // ADR-006: el retry es un nuevo pickup DENTRO del mismo pedido (grupo).
          shipmentGroupId: original.shipmentGroupId,
          shippingQuoteId: newQuoteId,
          carrier: original.carrier,
          serviceLevel: original.serviceLevel,
          trackingNumber: newTrackingNumber,
          labelUrl: "/labels/sample.pdf",
          status: ShipmentStatus.ready_for_pickup,
          weightGramsTotal: original.weightGramsTotal,
          costCents: original.costCents,
          shippingAddressSnapshot:
            original.shippingAddressSnapshot as unknown as object,
          pickupAddressSnapshot:
            original.pickupAddressSnapshot as unknown as object,
        },
      });

      // 3. Copiar packages (nuevos IDs)
      const newPackages = await Promise.all(
        original.packages.map((p) =>
          tx.package.create({
            data: {
              id: generateId("pkg"),
              shipmentId: newShipment.id,
              weightGrams: p.weightGrams,
              lengthCm: p.lengthCm,
              widthCm: p.widthCm,
              heightCm: p.heightCm,
              description: p.description,
            },
          }),
        ),
      );

      // 4. Tracking events iniciales del nuevo
      await tx.trackingEvent.createMany({
        data: [
          {
            id: generateId("evt"),
            shipmentId: newShipment.id,
            eventType: TrackingEventType.created,
            note: `Retry de ${original.id}`,
            occurredAt: now,
          },
          {
            id: generateId("evt"),
            shipmentId: newShipment.id,
            eventType: TrackingEventType.ready_for_pickup,
            occurredAt: now,
          },
        ],
      });

      // 5. Status history del nuevo (con referencia al original)
      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId: newShipment.id,
          fromStatus: ShipmentStatus.created,
          toStatus: ShipmentStatus.ready_for_pickup,
          source,
          payload: { retry_of: original.id },
          occurredAt: now,
        },
      });

      // 6. Marcar el original como returned (transición válida desde failed_delivery)
      await tx.shipment.update({
        where: { id: original.id },
        data: { status: ShipmentStatus.returned },
      });
      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId: original.id,
          fromStatus: ShipmentStatus.failed_delivery,
          toStatus: ShipmentStatus.returned,
          source,
          payload: { retried_as: newShipment.id },
          occurredAt: now,
        },
      });

      // 7. Cerrar el assignment activo del original (si lo hay).
      //    Legacy/no-op en el modelo grupo (la asignación vive en el grupo),
      //    pero cubre asignaciones por-shipment que pudieran existir.
      await tx.deliveryAssignment.updateMany({
        where: {
          shipmentId: original.id,
          status: { in: ACTIVE_ASSIGNMENT_STATUSES },
        },
        data: {
          status: AssignmentStatus.cancelled,
          completedAt: now,
        },
      });

      // 8. ADR-006: el nuevo pickup se suma al grupo; recomputamos el rollup
      //    (el original quedó returned, el nuevo ready_for_pickup).
      await tx.shipmentGroup.update({
        where: { id: original.shipmentGroupId },
        data: { originsCount: { increment: 1 } },
      });
      await recomputeGroupStatus(tx, original.shipmentGroupId);

      return { newShipment, newPackages };
    });

    // Outbound deferred a Buyer/Seller — el original cerró como returned
    logger.outboundDeferred({
      target: "buyer",
      method: "PATCH",
      path: `/api/v1/orders/${original.orderId}/seller-groups/${original.orderSellerGroupId}/shipping`,
      payload: {
        shipping_status: "returned",
        shipment_id: original.id,
        retried_as: result.newShipment.id,
        occurred_at: now.toISOString(),
      },
    });
    logger.outboundDeferred({
      target: "seller",
      method: "PATCH",
      path: `/api/v1/sales-orders/${original.salesOrderId}/shipping-status`,
      payload: {
        shipping_status: "returned",
        shipment_id: original.id,
        retried_as: result.newShipment.id,
        occurred_at: now.toISOString(),
      },
    });

    return NextResponse.json(
      toShipmentDTO(
        result.newShipment,
        result.newPackages,
        undefined,
        original.group.trackingNumber,
      ),
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
