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
import { OperatorStatus } from "@/generated/prisma/client";

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

    // ADR-006: la asignación vive a nivel pedido (grupo). Resolvemos el grupo
    // del shipment de la URL y matcheamos el assignment por shipmentGroupId
    // (shipmentId quedó nullable/legacy → no se puede filtrar por él).
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { shipmentGroupId: true },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.deliveryAssignment.update({
        where: { id: assignmentId, shipmentGroupId: shipment.shipmentGroupId },
        data: {
          ...(body.status && { status: body.status }),
          ...(body.operator_clerk_user_id && {
            operatorClerkUserId: body.operator_clerk_user_id,
          }),
        },
      });
      // Reasignar operador del pedido → el grupo registra al nuevo dueño.
      if (body.operator_clerk_user_id) {
        await tx.shipmentGroup.update({
          where: { id: shipment.shipmentGroupId },
          data: { assignedOperatorClerkUserId: body.operator_clerk_user_id },
        });
      }
      return a;
    });

    return NextResponse.json({
      id: updated.id,
      shipment_id: shipmentId,
      shipment_group_id: updated.shipmentGroupId,
      operator_clerk_user_id: updated.operatorClerkUserId,
      status: updated.status,
      assigned_at: updated.assignedAt.toISOString(),
      completed_at: updated.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
