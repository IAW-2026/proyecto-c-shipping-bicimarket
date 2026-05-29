// GET  /api/v1/shipments/{shipmentId}/assignments — lista assignments + operador
// POST /api/v1/shipments/{shipmentId}/assignments — SH5 create (JWT admin, docs/03)
//
// El GET joina con LogisticsOperator para que el detalle admin pueda mostrar
// quién tiene el shipment ahora mismo (filtrando por status activo).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { createAssignmentSchema } from "@/validation/assignments";
import {
  ShipmentStatus,
  StatusHistorySource,
  OperatorStatus,
} from "@/generated/prisma/client";
import type {
  AssignmentStatus as TAssignmentStatus,
} from "@/types/assignments";
import type {
  OperatorStatus as TOperatorStatus,
  VehicleType as TVehicleType,
} from "@/types/logistics-operators";
import type { ShipmentAssignmentDTO } from "@/types/assignments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    // ADR-006: la asignación vive a nivel pedido (grupo). Resolvemos el grupo
    // del shipment de la URL y listamos las asignaciones del pedido.
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { shipmentGroupId: true },
    });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const rows = await prisma.deliveryAssignment.findMany({
      where: { shipmentGroupId: shipment.shipmentGroupId },
      orderBy: { assignedAt: "desc" },
      include: { operator: true },
    });

    const data: ShipmentAssignmentDTO[] = rows.map((r) => ({
      id: r.id,
      shipment_id: shipmentId,
      status: r.status as TAssignmentStatus,
      assigned_at: r.assignedAt.toISOString(),
      completed_at: r.completedAt?.toISOString() ?? null,
      operator: {
        id: r.operator.id,
        clerk_user_id: r.operator.clerkUserId,
        full_name: r.operator.fullName,
        email: r.operator.email,
        phone: r.operator.phone,
        vehicle_type: r.operator.vehicleType as TVehicleType,
        license_plate: r.operator.licensePlate,
        status: r.operator.status as TOperatorStatus,
      },
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
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

      // ADR-006: el admin asigna el PEDIDO entero. La asignación se crea a
      // nivel grupo y el grupo registra al operador como dueño (override).
      const a = await tx.deliveryAssignment.create({
        data: {
          id: generateId("dla"),
          shipmentGroupId: shipment.shipmentGroupId,
          operatorClerkUserId: body.operator_clerk_user_id,
        },
      });
      await tx.shipmentGroup.update({
        where: { id: shipment.shipmentGroupId },
        data: { assignedOperatorClerkUserId: body.operator_clerk_user_id },
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
        shipment_id: shipmentId,
        shipment_group_id: assignment.shipmentGroupId,
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
