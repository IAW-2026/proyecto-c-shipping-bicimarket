// POST /api/v1/shipments/{shipmentId}/deliver — SH4 deliver (docs/03)
// Auth: JWT logistics. Atómico: crea tracking_event=delivered, delivery_proof,
// shipment.status=delivered, marca assignment activo como delivered.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { deliverShipmentSchema } from "@/validation/shipments";
import {
  ShipmentStatus,
  TrackingEventType,
  AssignmentStatus,
  StatusHistorySource,
} from "@/generated/prisma/enums";
import { assertTransition } from "@/lib/transitions";
import { logger } from "@/lib/logger";
import type { DeliverShipmentResponse } from "@/types/tracking-events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const operator = await getActiveOperator();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
    }

    const body = deliverShipmentSchema.parse(await req.json());

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    assertTransition(shipment.status as ShipmentStatus, ShipmentStatus.delivered);

    const occurredAt = new Date(body.occurred_at);

    const result = await prisma.$transaction(async (tx) => {
      await tx.trackingEvent.create({
        data: {
          id: generateId("evt"),
          shipmentId,
          eventType: TrackingEventType.delivered,
          location: null,
          note: body.note ?? null,
          occurredAt,
        },
      });

      const proof = await tx.deliveryProof.create({
        data: {
          id: generateId("prf"),
          shipmentId,
          proofPhotoUrl: body.proof_photo_url,
          signatureImageUrl: body.signature_image_url ?? null,
          note: body.note ?? null,
          deliveredAt: occurredAt,
        },
      });

      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: ShipmentStatus.delivered,
          deliveredAt: occurredAt,
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId,
          fromStatus: shipment.status,
          toStatus: ShipmentStatus.delivered,
          source: StatusHistorySource.logistics,
          occurredAt,
        },
      });

      // Cerrar assignment activo del operador, si existe
      await tx.deliveryAssignment.updateMany({
        where: {
          shipmentId,
          operatorClerkUserId: operator.clerkUserId,
          status: {
            in: [
              AssignmentStatus.assigned,
              AssignmentStatus.accepted,
              AssignmentStatus.picked_up,
            ],
          },
        },
        data: {
          status: AssignmentStatus.delivered,
          completedAt: occurredAt,
        },
      });

      return proof;
    });

    // ─── Sprint 1 (ADR-002): outbound diferido a 3 destinos ────────────────
    const occurredAtIso = occurredAt.toISOString();
    logger.outboundDeferred({
      target: "buyer",
      method: "PATCH",
      path: `/api/v1/orders/${shipment.orderId}/seller-groups/${shipment.orderSellerGroupId}/shipping`,
      payload: {
        shipping_status: "delivered",
        shipment_id: shipment.id,
        tracking_number: shipment.trackingNumber,
        occurred_at: occurredAtIso,
      },
    });
    logger.outboundDeferred({
      target: "seller",
      method: "PATCH",
      path: `/api/v1/sales-orders/${shipment.salesOrderId}/shipping-status`,
      payload: {
        shipping_status: "delivered",
        shipment_id: shipment.id,
        occurred_at: occurredAtIso,
      },
    });
    logger.outboundDeferred({
      target: "payments",
      method: "POST",
      path: "/api/v1/internal/shipment-delivered",
      payload: {
        shipment_id: shipment.id,
        order_id: shipment.orderId,
        order_seller_group_id: shipment.orderSellerGroupId,
        sales_order_id: shipment.salesOrderId,
        seller_profile_id: shipment.sellerProfileId,
        delivered_at: occurredAtIso,
      },
    });
    // ───────────────────────────────────────────────────────────────────────

    const response: DeliverShipmentResponse = {
      shipment_id: shipment.id,
      status: "delivered",
      delivered_at: occurredAtIso,
      proof: {
        photo_url: result.proofPhotoUrl,
        signature_url: result.signatureImageUrl,
        note: result.note,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err);
  }
}
