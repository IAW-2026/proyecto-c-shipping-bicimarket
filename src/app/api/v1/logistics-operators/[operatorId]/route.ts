// GET   /api/v1/logistics-operators/{operatorId} — detalle (JWT admin)
// PATCH /api/v1/logistics-operators/{operatorId} — editar (JWT admin)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toLogisticsOperatorDTO } from "@/lib/dto";

const patchSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.email().optional(),
  phone: z.string().min(1).optional(),
  document_id: z.string().min(1).optional(),
  vehicle_type: z.enum(["motorcycle", "car", "van", "truck"]).optional(),
  license_plate: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

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
    if (!operator || operator.deletedAt) {
      throw new ApiError("NOT_FOUND", 404, "Operador inexistente");
    }

    return NextResponse.json(toLogisticsOperatorDTO(operator));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    const { operatorId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = patchSchema.parse(await req.json());

    const updated = await prisma.logisticsOperator.update({
      where: { id: operatorId },
      data: {
        ...(body.full_name !== undefined && { fullName: body.full_name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.document_id !== undefined && { documentId: body.document_id }),
        ...(body.vehicle_type !== undefined && {
          vehicleType: body.vehicle_type,
        }),
        ...(body.license_plate !== undefined && {
          licensePlate: body.license_plate,
        }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(toLogisticsOperatorDTO(updated));
  } catch (err) {
    return handleApiError(err);
  }
}
