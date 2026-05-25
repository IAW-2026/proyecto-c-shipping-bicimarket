// POST /api/v1/shipments/{shipmentId}/packages — SH3 (S2S Seller, docs/03)
// Agrega un paquete a un shipment existente. Recalcula weight_grams_total y
// cost_cents del shipment (recálculo del costo: sprint 2 — por ahora se
// mantiene el costo de la quote original).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toPackageDTO } from "@/lib/dto";
import { addPackageSchema } from "@/validation/shipments";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const denied = requireServiceToken(req);
    if (denied) return denied;

    const { shipmentId } = await params;
    const body = addPackageSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
      });
      if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

      const pkg = await tx.package.create({
        data: {
          id: generateId("pkg"),
          shipmentId,
          weightGrams: body.weight_grams,
          lengthCm: body.length_cm,
          widthCm: body.width_cm,
          heightCm: body.height_cm,
          description: body.description ?? null,
        },
      });

      // Recalcular weight_grams_total
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          weightGramsTotal: shipment.weightGramsTotal + body.weight_grams,
        },
      });

      return pkg;
    });

    return NextResponse.json(toPackageDTO(result), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
