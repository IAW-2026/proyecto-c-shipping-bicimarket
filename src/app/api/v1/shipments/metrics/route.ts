// GET /api/v1/shipments/metrics — metricas operativas para Analytics.
// Auth: X-Service-Token exclusivo del Dashboard.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api-error";
import { requireDashboardServiceToken } from "@/lib/service-auth";
import { ShipmentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { ShipmentMetricsDTO } from "@/types/shipments";
import { shipmentMetricsQuerySchema } from "@/validation/shipments";

const ACTIVE_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
] as const;

export async function GET(req: NextRequest) {
  try {
    const denied = requireDashboardServiceToken(req);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const parsed = shipmentMetricsQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", 400, "Query params invalidos", {
        issues: parsed.error.issues,
      });
    }

    const { from, to } = parsed.data;
    const where: Prisma.ShipmentWhereInput = {
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [statusGroups, deliveredShipments] = await Promise.all([
      prisma.shipment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.shipment.findMany({
        where: {
          ...where,
          status: ShipmentStatus.delivered,
          deliveredAt: { not: null },
        },
        select: { createdAt: true, deliveredAt: true },
      }),
    ]);

    const counts = new Map(
      statusGroups.map((group) => [group.status, group._count._all]),
    );
    const count = (status: ShipmentStatus) => counts.get(status) ?? 0;
    const total = statusGroups.reduce(
      (sum, group) => sum + group._count._all,
      0,
    );
    const deliveredCount = count(ShipmentStatus.delivered);
    const inTransitCount = ACTIVE_STATUSES.reduce(
      (sum, status) => sum + count(status),
      0,
    );
    const totalDeliveryMs = deliveredShipments.reduce(
      (sum, shipment) =>
        sum +
        ((shipment.deliveredAt?.getTime() ?? shipment.createdAt.getTime()) -
          shipment.createdAt.getTime()),
      0,
    );
    const avgDeliveryDays =
      deliveredShipments.length === 0
        ? 0
        : totalDeliveryMs / deliveredShipments.length / 86_400_000;

    const dto: ShipmentMetricsDTO = {
      total,
      delivered_count: deliveredCount,
      in_transit_count: inTransitCount,
      failed_count: count(ShipmentStatus.failed_delivery),
      fulfillment_rate: total === 0 ? 0 : (deliveredCount / total) * 100,
      avg_delivery_time_days: Math.round(avgDeliveryDays * 10) / 10,
      backlog_by_status: ACTIVE_STATUSES.map((status) => ({
        status,
        count: count(status),
      })).filter(({ count: statusCount }) => statusCount > 0),
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
