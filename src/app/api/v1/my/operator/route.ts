// GET   /api/v1/my/operator — devuelve el LogisticsOperator del user logueado
// PATCH /api/v1/my/operator — el operador edita sus propios datos
//
// Auth: JWT logistics. El operador solo puede editar SUS campos (phone,
// document_id, vehicle_type, license_plate). Los campos de Clerk
// (full_name, email) los sincroniza `getActiveOperator` desde el JWT y no
// se editan acá. El `status` y el `clerk_user_id` solo los toca un admin
// desde /admin/operators/[id].

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toLogisticsOperatorDTO } from "@/lib/dto";

const updateMyOperatorSchema = z.object({
  phone: z.string().min(1, "Teléfono requerido").optional(),
  document_id: z
    .string()
    .min(1)
    .regex(/^\d+$/, "Solo números, sin puntos")
    .optional(),
  vehicle_type: z.enum(["motorcycle", "car", "van", "truck"]).optional(),
  license_plate: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Solo letras y números, sin espacios")
    .optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const operator = await getActiveOperator();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
    }
    return NextResponse.json(toLogisticsOperatorDTO(operator));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const operator = await getActiveOperator();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
    }

    const body = updateMyOperatorSchema.parse(await req.json());

    const updated = await prisma.logisticsOperator.update({
      where: { id: operator.id },
      data: {
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.document_id !== undefined && { documentId: body.document_id }),
        ...(body.vehicle_type !== undefined && {
          vehicleType: body.vehicle_type,
        }),
        ...(body.license_plate !== undefined && {
          licensePlate: body.license_plate.toUpperCase(),
        }),
      },
    });

    return NextResponse.json(toLogisticsOperatorDTO(updated));
  } catch (err) {
    return handleApiError(err);
  }
}
