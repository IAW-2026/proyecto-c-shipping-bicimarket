// POST /api/v1/shipments/{shipmentId}/assignments — SH5 (JWT admin, docs/03)
// Crea un delivery_assignment. Si shipment está en `created`, lo mueve a
// `ready_for_pickup` (transición válida automática).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { createAssignmentSchema } from "@/validation/assignments";
import {
  ShipmentStatus,
  StatusHistorySource,
  OperatorStatus,
} from "@/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !isAdmin(sessionClaims)) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = createAssignmentSchema.parse(await req.json());

    // Validar que el operador exista y esté activo
    const operator = await prisma.logisticsOperator.findUnique({
      where: { clerkUserId: body.operator_clerk_user_id },
    });
    if (!operator || operator.status !== OperatorStatus.active) {
      throw new ApiError(
        "OPERATOR_NOT_AVAILABLE",
        422,
        "Operador inexistente o inactivo",
        { operator_clerk_user_id: body.operator_clerk_user_id },
      );
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
      });
      if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

      const a = await tx.deliveryAssignment.create({
        data: {
          id: generateId("dla"),
          shipmentId,
          operatorClerkUserId: body.operator_clerk_user_id,
        },
      });

      // Si shipment estaba en `created`, mover a `ready_for_pickup`
      if (shipment.status === ShipmentStatus.created) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { status: ShipmentStatus.ready_for_pickup },
        });
        await tx.shipmentStatusHistory.create({
          data: {
            id: generateId("ssh"),
            shipmentId,
            fromStatus: ShipmentStatus.created,
            toStatus: ShipmentStatus.ready_for_pickup,
            source: StatusHistorySource.admin,
            occurredAt: new Date(),
          },
        });
      }

      return a;
    });

    return NextResponse.json(
      {
        id: assignment.id,
        shipment_id: assignment.shipmentId,
        operator_clerk_user_id: assignment.operatorClerkUserId,
        status: assignment.status,
        assigned_at: assignment.assignedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
