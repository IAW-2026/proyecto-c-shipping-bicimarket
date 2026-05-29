// POST /api/v1/shipments/{shipmentId}/tracking-events — SH4 create (docs/03)
// GET  /api/v1/shipments/{shipmentId}/tracking-events — SH4 list
//
// Auth POST: JWT logistics (operador activo) o S2S (carrier integration).
// Auth GET:  JWT (cualquier logueado) o S2S.
//
// Auto-asignación (modelo "marketplace de envíos"):
//   Si un operador hace POST con event_type=picked_up sobre un shipment en
//   ready_for_pickup que NO tiene assignment activo, le creamos el assignment
//   automáticamente. Esto permite que cualquier operador "agarre" envíos
//   disponibles desde la lista, sin pasar por un admin.
//
//   Si el shipment ya tiene un assignment activo de OTRO operador y otro
//   intenta agarrarlo → 409 SHIPMENT_ALREADY_ASSIGNED.

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
import {
  assertTransition,
  eventTypeToStatus,
} from "@/lib/transitions";
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

    // Auth: S2S o JWT logistics
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
        assignments: {
          where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
          select: { id: true, operatorClerkUserId: true },
        },
      },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const nextStatus = eventTypeToStatus(body.event_type);
    if (nextStatus && nextStatus !== shipment.status) {
      assertTransition(shipment.status as ShipmentStatus, nextStatus);
    }

    // ── Auto-asignación cuando el operador toma un envío disponible ──────
    // Solo aplica si es un operador logueado (no S2S), event_type=picked_up
    // y el shipment está en ready_for_pickup.
    let shouldAutoAssign = false;
    if (
      operatorClerkUserId &&
      body.event_type === TrackingEventType.picked_up &&
      shipment.status === ShipmentStatus.ready_for_pickup
    ) {
      const activeAssignment = shipment.assignments[0];
      if (!activeAssignment) {
        // Disponible — lo auto-asignamos.
        shouldAutoAssign = true;
      } else if (activeAssignment.operatorClerkUserId !== operatorClerkUserId) {
        // Ya lo tiene otro operador — no podés agarrarlo.
        throw new ApiError(
          "SHIPMENT_ALREADY_ASSIGNED",
          409,
          "Este envío ya fue tomado por otro operador",
          { existing_operator_clerk_user_id: activeAssignment.operatorClerkUserId },
        );
      }
      // Si activeAssignment.operatorClerkUserId === operatorClerkUserId,
      // sigue como antes (operador continúa con SU envío).
    }

    // ADR-005: si la transición es a picked_up, después de avanzar el estado
    // chequeamos si todos los siblings del mismo order_id ya están en
    // picked_up o posterior. Si sí, marcamos para emitir un log derivado
    // (sin persistir estado agregado). Solo aplica a órdenes multi-vendedor.
    type OrderAllPickedUpInfo = { orderId: string; shipmentIds: string[] };

    const { event, orderAllPickedUpInfo } = await prisma.$transaction(async (tx) => {
      let statusAlreadyAdvanced = false;
      let pickedUpInfo: OrderAllPickedUpInfo | null = null;

      // ── Optimistic concurrency: si auto-asign, intentar avanzar el status
      //    como guard atómico. Solo UN thread va a poder mover el shipment
      //    de ready_for_pickup → picked_up. Si dos operadores tocan "Ir a
      //    retirar" al mismo tiempo, el segundo ve count===0 y recibe 409
      //    en vez de crear un assignment fantasma.
      //    `updateMany` no requiere row-level lock — Postgres garantiza
      //    atomicidad por fila a nivel del WHERE.
      if (shouldAutoAssign && operatorClerkUserId && nextStatus) {
        const guard = await tx.shipment.updateMany({
          where: {
            id: shipmentId,
            status: ShipmentStatus.ready_for_pickup,
          },
          data: { status: nextStatus },
        });
        if (guard.count === 0) {
          // Alguien más se adelantó entre el read y el write.
          throw new ApiError(
            "SHIPMENT_ALREADY_ASSIGNED",
            409,
            "Otro operador acaba de tomar este envío. Refrescá la lista.",
          );
        }
        // Ganamos la carrera — creamos el assignment.
        await tx.deliveryAssignment.create({
          data: {
            id: generateId("dla"),
            shipmentId,
            operatorClerkUserId,
            status: AssignmentStatus.picked_up,
          },
        });
        statusAlreadyAdvanced = true;
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

      // Path normal: avance de status para flujos que NO son auto-asign.
      // (Ej: picked_up → in_transit → out_for_delivery; sin race porque
      //  solo el operador con assignment activo puede llegar acá.)
      if (
        nextStatus &&
        nextStatus !== shipment.status &&
        !statusAlreadyAdvanced
      ) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { status: nextStatus },
        });
      }

      // Audit history siempre que hubo cambio de status (sea por auto-asign
      // o por transición normal).
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
      }

      // ADR-005: detección de "todos los retiros del order_id están listos".
      // Solo se evalúa cuando la transición es a picked_up y el order tiene
      // siblings (>1 shipment). Si todos están picked_up o más adelante,
      // marcamos para logear un evento agregado fuera de la transacción.
      if (nextStatus === ShipmentStatus.picked_up) {
        const siblings = await tx.shipment.findMany({
          where: { orderId: shipment.orderId },
          select: { id: true, status: true },
        });
        if (siblings.length > 1) {
          const PICKED_UP_OR_BEYOND = new Set<ShipmentStatus>([
            ShipmentStatus.picked_up,
            ShipmentStatus.in_transit,
            ShipmentStatus.out_for_delivery,
            ShipmentStatus.delivered,
          ]);
          // El shipment actual ya se actualizó arriba (en updateMany o
          // update). El findMany debería ver el nuevo status, pero por las
          // dudas lo tratamos como picked_up explícitamente.
          const allPickedUp = siblings.every((s) =>
            s.id === shipmentId
              ? true
              : PICKED_UP_OR_BEYOND.has(s.status as ShipmentStatus),
          );
          if (allPickedUp) {
            pickedUpInfo = {
              orderId: shipment.orderId,
              shipmentIds: siblings.map((s) => s.id),
            };
          }
        }
      }

      return { event: ev, orderAllPickedUpInfo: pickedUpInfo };
    });

    // ─── Sprint 1 (ADR-002): outbound diferido a Buyer y Seller ────────────
    if (nextStatus) {
      logger.outboundDeferred({
        target: "buyer",
        method: "PATCH",
        path: `/api/v1/orders/${shipment.orderId}/seller-groups/${shipment.orderSellerGroupId}/shipping`,
        payload: {
          shipping_status: nextStatus,
          shipment_id: shipment.id,
          tracking_number: shipment.trackingNumber,
          occurred_at: body.occurred_at,
        },
      });
      logger.outboundDeferred({
        target: "seller",
        method: "PATCH",
        path: `/api/v1/sales-orders/${shipment.salesOrderId}/shipping-status`,
        payload: {
          shipping_status: nextStatus,
          shipment_id: shipment.id,
          occurred_at: body.occurred_at,
        },
      });
    }

    // ADR-005: si la última pickup del order_id se acaba de marcar,
    // emitimos un log derivado (consolidated picked_up). Es informativo
    // dentro del sprint 1 / ADR-002; en sprint 2 puede convertirse en una
    // llamada real al Buyer.
    if (orderAllPickedUpInfo) {
      logger.outboundDeferred({
        target: "buyer",
        method: "POST",
        path: `/api/v1/orders/${orderAllPickedUpInfo.orderId}/all-shipments-picked-up`,
        payload: {
          order_id: orderAllPickedUpInfo.orderId,
          shipment_ids: orderAllPickedUpInfo.shipmentIds,
          occurred_at: body.occurred_at,
        },
      });
    }
    // ───────────────────────────────────────────────────────────────────────

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

    // S2S o JWT
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
