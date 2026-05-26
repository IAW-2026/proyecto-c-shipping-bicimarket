// GET /api/v1/logistics-operators/{operatorId}/performance — métricas 30d
// para el detalle del operador. Auth: JWT admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { AssignmentStatus } from "@/generated/prisma/enums";
import type { OperatorPerformanceDTO } from "@/types/operator-performance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    const { operatorId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const operator = await prisma.logisticsOperator.findUnique({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new ApiError("NOT_FOUND", 404, "Operador inexistente");
    }

    const start30dAgo = new Date();
    start30dAgo.setDate(start30dAgo.getDate() - 30);
    start30dAgo.setHours(0, 0, 0, 0);

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        operatorClerkUserId: operator.clerkUserId,
        completedAt: { gte: start30dAgo },
      },
      select: { status: true, completedAt: true },
    });

    const delivered = assignments.filter(
      (a) => a.status === AssignmentStatus.delivered,
    ).length;
    const failed = assignments.filter(
      (a) =>
        a.status === AssignmentStatus.cancelled ||
        a.status === AssignmentStatus.reassigned,
    ).length;
    const successRate =
      delivered + failed > 0
        ? Math.round((delivered / (delivered + failed)) * 1000) / 10
        : 0;

    // Buckets diarios (30 días)
    const daily: OperatorPerformanceDTO["daily"] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const inDay = assignments.filter(
        (a) =>
          a.completedAt &&
          a.completedAt >= dayStart &&
          a.completedAt < dayEnd,
      );
      daily.push({
        date: dayStart.toISOString().slice(0, 10),
        delivered: inDay.filter(
          (a) => a.status === AssignmentStatus.delivered,
        ).length,
        failed: inDay.filter(
          (a) =>
            a.status === AssignmentStatus.cancelled ||
            a.status === AssignmentStatus.reassigned,
        ).length,
      });
    }

    const dto: OperatorPerformanceDTO = {
      delivered,
      failed,
      success_rate: successRate,
      daily,
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
