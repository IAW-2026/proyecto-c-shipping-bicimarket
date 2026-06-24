// GET /api/v1/logistics-operators/kpis — KPIs admin /admin/operators.
// Auth: JWT admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { AssignmentStatus, OperatorStatus } from "@/generated/prisma/client";
import type { OperatorsKpisDTO } from "@/types/admin-kpis";

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

export async function GET(_req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const start30dAgo = new Date();
    start30dAgo.setDate(start30dAgo.getDate() - 30);

    const [active, suspended, activeAssignments, deliveredCount, activeCount] =
      await Promise.all([
        prisma.logisticsOperator.count({
          where: { status: OperatorStatus.active, deletedAt: null },
        }),
        prisma.logisticsOperator.count({
          where: { status: OperatorStatus.suspended, deletedAt: null },
        }),
        prisma.deliveryAssignment.count({
          where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
        }),
        prisma.deliveryAssignment.count({
          where: {
            status: AssignmentStatus.delivered,
            completedAt: { gte: start30dAgo },
          },
        }),
        prisma.logisticsOperator.count({
          where: { status: OperatorStatus.active, deletedAt: null },
        }),
      ]);

    const avgDeliveries30d =
      activeCount > 0 ? Math.round(deliveredCount / activeCount) : 0;

    const dto: OperatorsKpisDTO = {
      active,
      suspended,
      active_assignments: activeAssignments,
      avg_deliveries_30d: avgDeliveries30d,
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
