// POST /api/v1/shipments/{shipmentId}/retry
// Reintenta el mismo envio: failed_delivery -> in_transit.
// Auth: operador activo asignado al pedido o admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getActiveOperator, requireAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentDTO } from "@/lib/dto";
import { recomputeGroupStatus } from "@/lib/group-status";
import { notifyShipmentStatus } from "@/lib/shipment-outbound";
import { assertTransition } from "@/lib/transitions";
import {
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
} from "@/generated/prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const { userId, sessionClaims } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");

    const admin = await requireAdmin(sessionClaims);
    const operator = admin ? null : await getActiveOperator();
    if (!admin && !operator) {
      throw new ApiError(
        "FORBIDDEN",
        403,
        "Admin u operador activo requerido",
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        packages: true,
        group: {
          select: {
            trackingNumber: true,
            assignedOperatorClerkUserId: true,
          },
        },
      },
    });
    if (!shipment) {
      throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");
    }

    if (
      operator &&
      shipment.group.assignedOperatorClerkUserId !== operator.clerkUserId
    ) {
      throw new ApiError(
        "FORBIDDEN",
        403,
        "Solo el operador asignado al pedido puede reintentar el envio",
      );
    }

    if (shipment.status === ShipmentStatus.in_transit) {
      return NextResponse.json(
        toShipmentDTO(
          shipment,
          shipment.packages,
          undefined,
          shipment.group.trackingNumber,
        ),
      );
    }

    assertTransition(
      shipment.status as ShipmentStatus,
      ShipmentStatus.in_transit,
    );

    const occurredAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const guard = await tx.shipment.updateMany({
        where: { id: shipmentId, status: ShipmentStatus.failed_delivery },
        data: { status: ShipmentStatus.in_transit },
      });
      if (guard.count === 0) {
        throw new ApiError(
          "INVALID_TRANSITION",
          409,
          "El estado del envio cambio mientras se procesaba el reintento",
        );
      }

      await tx.trackingEvent.create({
        data: {
          id: generateId("evt"),
          shipmentId,
          eventType: TrackingEventType.in_transit,
          note: "Reintento de entrega",
          occurredAt,
        },
      });
      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId,
          fromStatus: ShipmentStatus.failed_delivery,
          toStatus: ShipmentStatus.in_transit,
          source: admin
            ? StatusHistorySource.admin
            : StatusHistorySource.logistics,
          payload: { retry: true },
          occurredAt,
        },
      });
      await recomputeGroupStatus(tx, shipment.shipmentGroupId);

      return tx.shipment.findUniqueOrThrow({
        where: { id: shipmentId },
        include: { packages: true },
      });
    });

    await notifyShipmentStatus({
      shipmentId,
      shipmentStatus: ShipmentStatus.in_transit,
      orderId: shipment.orderId,
      orderSellerGroupId: shipment.orderSellerGroupId,
      salesOrderId: shipment.salesOrderId,
      orderTrackingNumber: shipment.group.trackingNumber,
      occurredAt: occurredAt.toISOString(),
    });

    return NextResponse.json(
      toShipmentDTO(
        updated,
        updated.packages,
        undefined,
        shipment.group.trackingNumber,
      ),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
