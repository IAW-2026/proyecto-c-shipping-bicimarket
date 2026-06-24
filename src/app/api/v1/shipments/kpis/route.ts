// GET /api/v1/shipments/kpis — KPIs admin para la página /admin/shipments.
// Auth: JWT admin. Devuelve `ShipmentsKpisDTO` con counts + deltas + sparklines.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { ShipmentStatus } from "@/generated/prisma/client";
import type { ShipmentsKpisDTO } from "@/types/admin-kpis";

const ACTIVE_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
];

export async function GET(_req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const start30dAgo = new Date(startOfToday);
    start30dAgo.setDate(start30dAgo.getDate() - 30);
    const start60dAgo = new Date(startOfToday);
    start60dAgo.setDate(start60dAgo.getDate() - 60);

    const [
      active,
      deliveredToday,
      deliveredYesterday,
      failed30d,
      failedPrev30d,
      returned30d,
      returnedPrev30d,
      deliveredLast7Days,
    ] = await Promise.all([
      prisma.shipment.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.delivered,
          deliveredAt: { gte: startOfToday },
        },
      }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.delivered,
          deliveredAt: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.failed_delivery,
          updatedAt: { gte: start30dAgo },
        },
      }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.failed_delivery,
          updatedAt: { gte: start60dAgo, lt: start30dAgo },
        },
      }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.returned,
          updatedAt: { gte: start30dAgo },
        },
      }),
      prisma.shipment.count({
        where: {
          status: ShipmentStatus.returned,
          updatedAt: { gte: start60dAgo, lt: start30dAgo },
        },
      }),
      computeDailyDelivered(startOfToday, 7),
    ]);

    const dto: ShipmentsKpisDTO = {
      active,
      delivered_today: deliveredToday,
      failed_30d: failed30d,
      returned_30d: returned30d,
      delta_active: 0, // sprint 1: sin baseline histórico, queda en 0
      delta_delivered_today: deliveredToday - deliveredYesterday,
      delta_failed_30d: failed30d - failedPrev30d,
      delta_returned_30d: returned30d - returnedPrev30d,
      sparkline_active: undefined,
      sparkline_delivered: deliveredLast7Days,
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}

async function computeDailyDelivered(
  startOfToday: Date,
  days: number,
): Promise<number[]> {
  const buckets: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - i);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    const count = await prisma.shipment.count({
      where: {
        status: ShipmentStatus.delivered,
        deliveredAt: { gte: from, lt: to },
      },
    });
    buckets.push(count);
  }
  return buckets;
}
