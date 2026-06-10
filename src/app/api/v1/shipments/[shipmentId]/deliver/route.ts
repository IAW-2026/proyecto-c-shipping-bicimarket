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
import type { BuyerOrderShippingPatchBody } from "@/types/external/buyer";
import type {
  PaymentsShipmentDeliveredBody,
  SellerSalesOrderShippingStatusPatchBody,
} from "@/types/external/payments";

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
      include: { group: { select: { trackingNumber: true } } },
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
    const buyerBody: BuyerOrderShippingPatchBody = {
      status: "delivered",
      shipping_status: "delivered",
      shipment_id: shipment.id,
      tracking_number: shipment.group.trackingNumber,
      occurred_at: occurredAtIso,
    };
    const sellerBody: SellerSalesOrderShippingStatusPatchBody = {
      shipping_status: "delivered",
      shipment_id: shipment.id,
      occurred_at: occurredAtIso,
    };
    const paymentsBody: PaymentsShipmentDeliveredBody = {
      shipment_id: shipment.id,
      order_id: shipment.orderId,
      order_seller_group_id: shipment.orderSellerGroupId,
      sales_order_id: shipment.salesOrderId,
      seller_profile_id: shipment.sellerProfileId,
      delivered_at: occurredAtIso,
    };

    try {
      const [buyerRes, sellerRes, paymentsRes] = await Promise.all([
        callServiceApi(
          "buyer",
          `/api/v1/orders/${shipment.orderId}/seller-groups/${shipment.orderSellerGroupId}/shipping`,
          { method: "PATCH", body: buyerBody },
        ),
        callServiceApi(
          "seller",
          `/api/v1/sales-orders/${shipment.salesOrderId}/shipping-status`,
          { method: "PATCH", body: sellerBody },
        ),
        callServiceApi("payments", "/api/v1/internal/shipment-delivered", {
          method: "POST",
          body: paymentsBody,
        }),
      ]);

      if (!buyerRes.ok) {
        throw new ApiError("UPSTREAM_ERROR", 502, "Buyer rechazo la entrega", {
          target: "buyer",
          upstream_status: buyerRes.status,
          shipment_id: shipment.id,
        });
      }
      if (!sellerRes.ok) {
        throw new ApiError("UPSTREAM_ERROR", 502, "Seller rechazo la entrega", {
          target: "seller",
          upstream_status: sellerRes.status,
          shipment_id: shipment.id,
        });
      }
      if (!paymentsRes.ok) {
        throw new ApiError(
          "UPSTREAM_ERROR",
          502,
          "Payments rechazo la liquidacion por entrega",
          {
            target: "payments",
            upstream_status: paymentsRes.status,
            shipment_id: shipment.id,
          },
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("UPSTREAM_ERROR", 502, "Fallo la propagacion de la entrega", {
        shipment_id: shipment.id,
        cause: String(err),
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
