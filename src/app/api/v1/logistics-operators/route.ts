// GET  /api/v1/logistics-operators — SH5 list (JWT admin, docs/03)
// POST /api/v1/logistics-operators — SH5 create (JWT admin)
//
// El GET admite dos modos:
//   - Simple (default): devuelve LogisticsOperatorDTO[]. Lo usa el modal de
//     asignar operador y el dropdown de filtros.
//   - ?detailed=1: devuelve LogisticsOperatorAdminDTO[] con counts derivados
//     (active_assignments_count, delivered_30d, failed_30d). Lo usa la tabla
//     /admin/operators.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { paginate } from "@/lib/pagination";
import { toLogisticsOperatorDTO } from "@/lib/dto";
import { createLogisticsOperatorSchema } from "@/validation/logistics-operators";
import {
  AssignmentStatus,
  OperatorStatus,
  VehicleType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { LogisticsOperatorAdminDTO } from "@/types/operator-performance";

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

const SORT_MAP: Record<string, string> = {
  created_at: "createdAt",
  full_name: "fullName",
  status: "status",
};

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const { searchParams } = new URL(req.url);
    const detailed = searchParams.get("detailed") === "1";

    const q = searchParams.get("q")?.trim() ?? "";
    const statusArr = searchParams.getAll("status[]");
    const vehicleArr = searchParams.getAll("vehicle_type[]");
    const sortBy = searchParams.get("sort_by") ?? "created_at";
    const sortDir = (searchParams.get("sort_dir") ?? "desc") as "asc" | "desc";

    const where: Prisma.LogisticsOperatorWhereInput = {
      deletedAt: null,
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { documentId: { contains: q, mode: "insensitive" } },
          { licensePlate: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(statusArr.length > 0 && {
        status: { in: statusArr as OperatorStatus[] },
      }),
      ...(vehicleArr.length > 0 && {
        vehicleType: { in: vehicleArr as VehicleType[] },
      }),
    };

    const result = await paginate(
      prisma.logisticsOperator,
      {
        where,
        orderBy: { [SORT_MAP[sortBy] ?? "createdAt"]: sortDir },
      },
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("per_page") ?? 20),
      },
    );

    if (!detailed) {
      return NextResponse.json({
        data: (result.data as never[]).map(toLogisticsOperatorDTO),
        pagination: result.pagination,
      });
    }

    // Modo detailed: hidratar counts derivados por operador
    const operatorIds = (result.data as { clerkUserId: string }[]).map(
      (o) => o.clerkUserId,
    );
    const start30dAgo = new Date();
    start30dAgo.setDate(start30dAgo.getDate() - 30);

    const counts = await Promise.all(
      operatorIds.map(async (clerkUserId) => {
        const [activeCount, delivered, failed] = await Promise.all([
          prisma.deliveryAssignment.count({
            where: {
              operatorClerkUserId: clerkUserId,
              status: { in: ACTIVE_ASSIGNMENT_STATUSES },
            },
          }),
          prisma.deliveryAssignment.count({
            where: {
              operatorClerkUserId: clerkUserId,
              status: AssignmentStatus.delivered,
              completedAt: { gte: start30dAgo },
            },
          }),
          prisma.deliveryAssignment.count({
            where: {
              operatorClerkUserId: clerkUserId,
              status: {
                in: [AssignmentStatus.cancelled, AssignmentStatus.reassigned],
              },
              completedAt: { gte: start30dAgo },
            },
          }),
        ]);
        return { clerkUserId, activeCount, delivered, failed };
      }),
    );

    const countMap = new Map(counts.map((c) => [c.clerkUserId, c]));

    const data: LogisticsOperatorAdminDTO[] = (
      result.data as never[]
    ).map((op) => {
      const dto = toLogisticsOperatorDTO(op);
      const c = countMap.get(dto.clerk_user_id);
      return {
        ...dto,
        active_assignments_count: c?.activeCount ?? 0,
        delivered_30d: c?.delivered ?? 0,
        failed_30d: c?.failed ?? 0,
      };
    });

    return NextResponse.json({ data, pagination: result.pagination });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = createLogisticsOperatorSchema.parse(await req.json());

    const operator = await prisma.logisticsOperator.create({
      data: {
        id: generateId("lop"),
        clerkUserId: body.clerk_user_id,
        fullName: body.full_name,
        email: body.email,
        phone: body.phone,
        documentId: body.document_id,
        vehicleType: body.vehicle_type,
        licensePlate: body.license_plate,
      },
    });

    return NextResponse.json(toLogisticsOperatorDTO(operator), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
