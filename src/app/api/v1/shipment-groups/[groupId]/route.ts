// GET /api/v1/shipment-groups/{groupId} — ADR-006
//
// Vista GLOBAL del pedido (todos los vendedores + sus paquetes). La consumen:
//   - el operador (que maneja el pedido entero), y
//   - el admin.
// Es el equivalente "1 pedido" del detalle, complementando el detalle de un
// shipment puntual (/shipments/{id}). Devuelve un ShipmentGroupDTO.
//
// Auth: JWT admin u operador (record). El group_id puede ser el "grp_…" o el
// tracking global "BMK-…" — aceptamos ambos para que sea fácil de linkear.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOperatorRecord, requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentGroupDTOFromEntity } from "@/lib/dto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");

    const isAdminUser = await requireAdmin(sessionClaims);
    if (!isAdminUser) {
      const operator = await getOperatorRecord();
      if (!operator) {
        throw new ApiError("FORBIDDEN", 403, "Admin u operador requerido");
      }
    }

    const id = groupId.trim();
    const upper = id.toUpperCase();
    const group = await prisma.shipmentGroup.findFirst({
      where: { OR: [{ id }, { trackingNumber: upper }] },
      include: {
        shipments: {
          include: { packages: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!group) {
      throw new ApiError("NOT_FOUND", 404, "Pedido inexistente");
    }

    return NextResponse.json(
      toShipmentGroupDTOFromEntity(group, group.shipments),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
