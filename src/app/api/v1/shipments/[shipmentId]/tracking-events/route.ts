// POST /api/v1/shipments/{shipmentId}/tracking-events - SH4 create (docs/03)
// GET  /api/v1/shipments/{shipmentId}/tracking-events - SH4 list
//
// Auth POST: JWT logistics (operador activo) o S2S (carrier integration).
// Auth GET:  JWT (cualquier logueado) o S2S.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { getActiveOperator } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { paginate } from "@/lib/pagination";
import { toTrackingEventDTO } from "@/lib/dto";
import { createTrackingEventSchema } from "@/validation/shipments";
import { assertTransition, eventTypeToStatus } from "@/lib/transitions";
import {
  AssignmentStatus,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
} from "@/generated/prisma/client";
import { recomputeGroupStatus } from "@/lib/group-status";
import { notifyShipmentStatus } from "@/lib/shipment-outbound";

const MAX_FAILED_DELIVERY_ATTEMPTS = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const s2sDenied = requireServiceToken(req);
    let source: typeof StatusHistorySource.logistics | typeof StatusHistorySource.system =
      StatusHistorySource.system;
    let operatorClerkUserId: string | null = null;
    if (s2sDenied) {
      const operator = await getActiveOperator();
      if (!operator) {
        throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
      }
      source = StatusHistorySource.logistics;
      operatorClerkUserId = operator.clerkUserId;
    }

    const body = createTrackingEventSchema.parse(await req.json());

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        group: {
          select: {
            id: true,
            trackingNumber: true,
            assignedOperatorClerkUserId: true,
          },
        },
      },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const nextStatus = eventTypeToStatus(body.event_type);
    if (nextStatus && nextStatus !== shipment.status) {
      assertTransition(shipment.status as ShipmentStatus, nextStatus);
    }

    let shouldClaimGroup = false;
    if (
      operatorClerkUserId &&
      body.event_type === TrackingEventType.picked_up &&
      shipment.status === ShipmentStatus.ready_for_pickup
    ) {
      const ownerId = shipment.group.assignedOperatorClerkUserId;
      if (!ownerId) {
        shouldClaimGroup = true;
      } else if (ownerId !== operatorClerkUserId) {
        throw new ApiError(
          "SHIPMENT_ALREADY_ASSIGNED",
          409,
          "Este pedido ya fue tomado por otro operador",
          { existing_operator_clerk_user_id: ownerId },
        );
      }
    }

    if (
      operatorClerkUserId &&
      shipment.group.assignedOperatorClerkUserId &&
      shipment.group.assignedOperatorClerkUserId !== operatorClerkUserId
    ) {
      throw new ApiError(
        "FORBIDDEN",
        403,
        "Solo el operador asignado al pedido puede cambiar su estado",
      );
    }

    if (
      operatorClerkUserId &&
      !shipment.group.assignedOperatorClerkUserId &&
      body.event_type !== TrackingEventType.picked_up
    ) {
      throw new ApiError(
        "FORBIDDEN",
        403,
        "El pedido debe ser tomado antes de cambiar su estado",
      );
    }

    if (nextStatus === shipment.status) {
      const existingEvent = await prisma.trackingEvent.findFirst({
        where: { shipmentId, eventType: body.event_type },
        orderBy: { occurredAt: "desc" },
      });
      if (existingEvent) {
        return NextResponse.json(toTrackingEventDTO(existingEvent));
      }
    }

    const { event, finalStatus } = await prisma.$transaction(async (tx) => {
      if (shouldClaimGroup && operatorClerkUserId) {
        const groupGuard = await tx.shipmentGroup.updateMany({
          where: {
            id: shipment.shipmentGroupId,
            assignedOperatorClerkUserId: null,
          },
          data: { assignedOperatorClerkUserId: operatorClerkUserId },
        });
        if (groupGuard.count === 0) {
          throw new ApiError(
            "SHIPMENT_ALREADY_ASSIGNED",
            409,
            "Otro operador acaba de tomar este pedido. Refresca la lista.",
          );
        }

        await tx.deliveryAssignment.create({
          data: {
            id: generateId("dla"),
            shipmentGroupId: shipment.shipmentGroupId,
            operatorClerkUserId,
            status: AssignmentStatus.picked_up,
          },
        });
      }

      if (nextStatus && nextStatus !== shipment.status) {
        if (
          shipment.status === ShipmentStatus.ready_for_pickup &&
          nextStatus === ShipmentStatus.picked_up
        ) {
          const guard = await tx.shipment.updateMany({
            where: { id: shipmentId, status: ShipmentStatus.ready_for_pickup },
            data: { status: nextStatus },
          });
          if (guard.count === 0) {
            throw new ApiError(
              "SHIPMENT_ALREADY_ASSIGNED",
              409,
              "Este envio acaba de actualizarse. Refresca la lista.",
            );
          }
        } else {
          const guard = await tx.shipment.updateMany({
            where: { id: shipmentId, status: shipment.status },
            data: { status: nextStatus },
          });
          if (guard.count === 0) {
            throw new ApiError(
              "INVALID_TRANSITION",
              409,
              "El estado del envio cambio mientras se procesaba la operacion",
            );
          }
        }
      }

      const ev = await tx.trackingEvent.create({
        data: {
          id: generateId("evt"),
          shipmentId,
          eventType: body.event_type,
          location: body.location ?? null,
          note: body.note ?? null,
          occurredAt: new Date(body.occurred_at),
        },
      });

      let persistedStatus = nextStatus ?? (shipment.status as ShipmentStatus);
      if (nextStatus && nextStatus !== shipment.status) {
        await tx.shipmentStatusHistory.create({
          data: {
            id: generateId("ssh"),
            shipmentId,
            fromStatus: shipment.status,
            toStatus: nextStatus,
            source,
            occurredAt: new Date(body.occurred_at),
          },
        });

        if (nextStatus === ShipmentStatus.failed_delivery) {
          const failedAttempts = await tx.trackingEvent.count({
            where: {
              shipmentId,
              eventType: TrackingEventType.failed_delivery,
            },
          });

          if (failedAttempts >= MAX_FAILED_DELIVERY_ATTEMPTS) {
            assertTransition(
              ShipmentStatus.failed_delivery,
              ShipmentStatus.returned,
            );
            await tx.shipment.update({
              where: { id: shipmentId },
              data: { status: ShipmentStatus.returned },
            });
            await tx.trackingEvent.create({
              data: {
                id: generateId("evt"),
                shipmentId,
                eventType: TrackingEventType.returned,
                note: `Devolucion automatica tras ${failedAttempts} intentos fallidos`,
                occurredAt: new Date(body.occurred_at),
              },
            });
            await tx.shipmentStatusHistory.create({
              data: {
                id: generateId("ssh"),
                shipmentId,
                fromStatus: ShipmentStatus.failed_delivery,
                toStatus: ShipmentStatus.returned,
                source: StatusHistorySource.system,
                payload: { failed_attempts: failedAttempts },
                occurredAt: new Date(body.occurred_at),
              },
            });
            persistedStatus = ShipmentStatus.returned;
          }
        }

        await recomputeGroupStatus(tx, shipment.shipmentGroupId);
      }

      return { event: ev, finalStatus: persistedStatus };
    });

    if (nextStatus && nextStatus !== shipment.status) {
      await notifyShipmentStatus({
        shipmentId: shipment.id,
        shipmentStatus: finalStatus as Exclude<
          ShipmentStatus,
          typeof ShipmentStatus.created
        >,
        orderId: shipment.orderId,
        orderSellerGroupId: shipment.orderSellerGroupId,
        salesOrderId: shipment.salesOrderId,
        orderTrackingNumber: shipment.group.trackingNumber,
        occurredAt: body.occurred_at,
      });
    }

    return NextResponse.json(toTrackingEventDTO(event), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const s2sDenied = requireServiceToken(req);
    if (s2sDenied) {
      const { userId } = await auth();
      if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");
    }

    const { searchParams } = new URL(req.url);

    const result = await paginate(
      prisma.trackingEvent,
      {
        where: { shipmentId },
        orderBy: { occurredAt: "asc" },
      },
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("limit") ?? 50),
      },
    );

    return NextResponse.json({
      data: (result.data as never[]).map(toTrackingEventDTO),
      pagination: result.pagination,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
