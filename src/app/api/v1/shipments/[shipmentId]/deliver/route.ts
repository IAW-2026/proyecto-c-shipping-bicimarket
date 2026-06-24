// POST /api/v1/shipments/{shipmentId}/deliver - SH4 deliver (docs/03)
// Auth: JWT logistics. Atomico: crea tracking_event=delivered, delivery_proof,
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
} from "@/generated/prisma/client";
import { assertTransition } from "@/lib/transitions";
import { callServiceApi } from "@/lib/service-auth";
import { recomputeGroupStatus } from "@/lib/group-status";
import type { DeliverShipmentResponse } from "@/types/tracking-events";
import type {
  PaymentsShipmentDeliveredBody,
} from "@/types/external/payments";
import { notifyShipmentStatus } from "@/lib/shipment-outbound";
import { logger } from "@/lib/logger";

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
      include: {
        group: {
          select: {
            trackingNumber: true,
            assignedOperatorClerkUserId: true,
          },
        },
      },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    if (shipment.group.assignedOperatorClerkUserId !== operator.clerkUserId) {
      throw new ApiError(
        "FORBIDDEN",
        403,
        "Solo el operador asignado al pedido puede confirmar la entrega",
      );
    }

    if (shipment.status === ShipmentStatus.delivered) {
      const existingProof = await prisma.deliveryProof.findUnique({
        where: { shipmentId },
      });
      if (existingProof) {
        return NextResponse.json({
          shipment_id: shipment.id,
          status: "delivered",
          delivered_at:
            shipment.deliveredAt?.toISOString() ??
            existingProof.deliveredAt.toISOString(),
          proof: {
            photo_url: existingProof.proofPhotoUrl,
            signature_url: existingProof.signatureImageUrl,
            note: existingProof.note,
          },
        } satisfies DeliverShipmentResponse);
      }
    }

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
          proofPhotoUrl: body.proof_photo_url ?? null,
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

      const rollup = await recomputeGroupStatus(tx, shipment.shipmentGroupId);
      if (rollup === ShipmentStatus.delivered) {
        await tx.deliveryAssignment.updateMany({
          where: {
            shipmentGroupId: shipment.shipmentGroupId,
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
      }

      return proof;
    });

    const occurredAtIso = occurredAt.toISOString();
    const paymentsBody: PaymentsShipmentDeliveredBody = {
      shipment_id: shipment.id,
      order_id: shipment.orderId,
      order_seller_group_id: shipment.orderSellerGroupId,
      sales_order_id: shipment.salesOrderId,
      seller_profile_id: shipment.sellerProfileId,
      delivered_at: occurredAtIso,
    };

    await notifyShipmentStatus({
      shipmentId: shipment.id,
      shipmentStatus: ShipmentStatus.delivered,
      orderId: shipment.orderId,
      orderSellerGroupId: shipment.orderSellerGroupId,
      salesOrderId: shipment.salesOrderId,
      orderTrackingNumber: shipment.group.trackingNumber,
      occurredAt: occurredAtIso,
    });

    const paymentsPath = "/api/v1/internal/shipment-delivered";
    logger.info({
      msg: "shipment-delivered-post-prepared",
      target: "payments",
      method: "POST",
      path: paymentsPath,
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      payload: paymentsBody,
    });

    const [paymentsResult] = await Promise.allSettled([
      callServiceApi("payments", paymentsPath, {
        method: "POST",
        body: paymentsBody,
        idempotencyKey: `shipment-delivered:${shipment.id}`,
      }),
    ]);
    if (paymentsResult.status === "rejected") {
      logger.outboundFailed({
        target: "payments",
        method: "POST",
        path: paymentsPath,
        payload: paymentsBody,
        shipmentId: shipment.id,
        cause: String(paymentsResult.reason),
      });
    } else if (!paymentsResult.value.ok) {
      logger.outboundFailed({
        target: "payments",
        method: "POST",
        path: paymentsPath,
        payload: paymentsBody,
        shipmentId: shipment.id,
        upstreamStatus: paymentsResult.value.status,
      });
    } else {
      logger.info({
        msg: "shipment-delivered-post-succeeded",
        target: "payments",
        method: "POST",
        path: paymentsPath,
        shipmentId: shipment.id,
        upstreamStatus: paymentsResult.value.status,
      });
    }

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
