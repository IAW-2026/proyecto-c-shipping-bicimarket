// GET /api/v1/logistics-operators/{operatorId}/active-assignments
// Mini lista de envíos activos del operador para la card del detalle.
// Auth: JWT admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { AssignmentStatus, ShipmentStatus } from "@/generated/prisma/enums";
import type { OperatorActiveAssignmentDTO } from "@/types/operator-performance";
import type { Address } from "@/types/common";
import type { ShipmentStatus as TShipmentStatus } from "@/types/shipments";

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

const ACTIVE_SHIPMENT_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
];

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

    const shipments = await prisma.shipment.findMany({
      where: {
        assignments: {
          some: {
            operatorClerkUserId: operator.clerkUserId,
            status: { in: ACTIVE_ASSIGNMENT_STATUSES },
          },
        },
        status: { in: ACTIVE_SHIPMENT_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const data: OperatorActiveAssignmentDTO[] = shipments.map((s) => ({
      shipment_id: s.id,
      tracking_number: s.trackingNumber,
      status: s.status as TShipmentStatus,
      shipping_address: s.shippingAddressSnapshot as unknown as Address,
      weight_grams_total: s.weightGramsTotal,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
