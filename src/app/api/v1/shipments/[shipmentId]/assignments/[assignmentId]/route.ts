// PATCH /api/v1/shipments/{shipmentId}/assignments/{assignmentId}
// SH5 reassign (JWT admin, docs/03)
//
// Sprint 1: implementación mínima — cambio de operator y/o status. La
// validación de transiciones de AssignmentStatus se difiere a sprint 2.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { patchAssignmentSchema } from "@/validation/assignments";
import { OperatorStatus } from "@/generated/prisma/enums";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ shipmentId: string; assignmentId: string }>;
  },
) {
  try {
    const { assignmentId, shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = patchAssignmentSchema.parse(await req.json());

    // Si reasignás, validar que el nuevo operador existe y está activo
    if (body.operator_clerk_user_id) {
      const newOperator = await prisma.logisticsOperator.findUnique({
        where: { clerkUserId: body.operator_clerk_user_id },
      });
      if (!newOperator || newOperator.status !== OperatorStatus.active) {
        throw new ApiError(
          "OPERATOR_NOT_AVAILABLE",
          422,
          "Operador inexistente o inactivo",
          { operator_clerk_user_id: body.operator_clerk_user_id },
        );
      }
    }

    const updated = await prisma.deliveryAssignment.update({
      where: { id: assignmentId, shipmentId },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.operator_clerk_user_id && {
          operatorClerkUserId: body.operator_clerk_user_id,
        }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      shipment_id: updated.shipmentId,
      operator_clerk_user_id: updated.operatorClerkUserId,
      status: updated.status,
      assigned_at: updated.assignedAt.toISOString(),
      completed_at: updated.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
