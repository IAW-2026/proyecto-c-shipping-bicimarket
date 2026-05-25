// GET /api/v1/my/assignments — SH5 my (JWT logistics, docs/03)
// Lista los shipments asignados al operador logueado, con dirección hidratada
// para que la UI mobile-first no tenga que hacer otra round-trip.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { paginate } from "@/lib/pagination";
import { toAssignmentDTO } from "@/lib/dto";
import {
  ShipmentStatus,
  AssignmentStatus,
} from "@/generated/prisma/enums";

const ACTIVE_SHIPMENT_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
];

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

export async function GET(req: NextRequest) {
  try {
    const operator = await getActiveOperator();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
    }

    const { searchParams } = new URL(req.url);

    const result = await paginate(
      prisma.shipment,
      {
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
        include: { packages: true },
      },
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("limit") ?? 20),
      },
    );

    return NextResponse.json({
      data: (
        result.data as Array<
          Parameters<typeof toAssignmentDTO>[0]
        >
      ).map(toAssignmentDTO),
      pagination: result.pagination,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
