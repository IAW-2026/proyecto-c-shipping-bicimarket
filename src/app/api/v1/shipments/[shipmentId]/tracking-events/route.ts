// POST /api/v1/shipments/{shipmentId}/tracking-events — SH4 create (docs/03)
// GET  /api/v1/shipments/{shipmentId}/tracking-events — SH4 list
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
import {
  assertTransition,
  eventTypeToStatus,
} from "@/lib/transitions";
import { ShipmentStatus, StatusHistorySource } from "@/generated/prisma/enums";
import { logger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    // S2S o JWT logistics
    const s2sDenied = requireServiceToken(req);
    let source: typeof StatusHistorySource.logistics | typeof StatusHistorySource.system =
      StatusHistorySource.system;
    if (s2sDenied) {
      const operator = await getActiveOperator();
      if (!operator) {
        throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
      }
      source = StatusHistorySource.logistics;
    }

    const body = createTrackingEventSchema.parse(await req.json());

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const nextStatus = eventTypeToStatus(body.event_type);
    if (nextStatus && nextStatus !== shipment.status) {
      assertTransition(shipment.status as ShipmentStatus, nextStatus);
    }

    const event = await prisma.$transaction(async (tx) => {
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

      if (nextStatus && nextStatus !== shipment.status) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { status: nextStatus },
        });
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

      return ev;
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
