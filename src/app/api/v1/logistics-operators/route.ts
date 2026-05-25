// GET  /api/v1/logistics-operators — SH5 list (JWT admin, docs/03)
// POST /api/v1/logistics-operators — SH5 create (JWT admin)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { paginate } from "@/lib/pagination";
import { toLogisticsOperatorDTO } from "@/lib/dto";
import { createLogisticsOperatorSchema } from "@/validation/logistics-operators";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !isAdmin(sessionClaims)) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const { searchParams } = new URL(req.url);

    const result = await paginate(
      prisma.logisticsOperator,
      {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("per_page") ?? 20),
      },
    );

    return NextResponse.json({
      data: (result.data as never[]).map(toLogisticsOperatorDTO),
      pagination: result.pagination,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !isAdmin(sessionClaims)) {
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
