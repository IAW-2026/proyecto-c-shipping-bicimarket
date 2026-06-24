// GET /api/v1/admin/shipment-groups — ADR-006
//
// Lista paginada de pedidos (ShipmentGroup). Cada item agrupa los N shipments
// de un pedido (uno por vendedor en órdenes multi-vendedor). La tabla admin de
// /admin/shipments usa este endpoint para mostrar 1 fila = 1 pedido.
//
// Ahora que el grupo es una entidad, la query es directa sobre shipment_groups
// (sin groupBy en memoria). El rollup_status sale del status persistido.
//
// Filtros: tracking_number (busca el global "BMK-" del grupo O el individual
// "TRK-AR-" de cualquiera de sus shipments), seller, order_id, status[]
// (sobre el rollup del grupo), rango de fechas. Sort: created_at u order_id.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentGroupDTOFromEntity } from "@/lib/dto";
import { ShipmentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const { searchParams } = new URL(req.url);

    const trackingNumber = searchParams.get("tracking_number");
    const sellerProfileId = searchParams.get("seller_profile_id");
    const orderIdFilter = searchParams.get("order_id");
    const statusArr = searchParams.getAll("status[]");
    const createdFrom = searchParams.get("created_at_from");
    const createdTo = searchParams.get("created_at_to");
    const sortBy = searchParams.get("sort_by") ?? "created_at";
    const sortDir = (searchParams.get("sort_dir") ?? "desc") as "asc" | "desc";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const rawLimit = Number(searchParams.get("per_page") ?? DEFAULT_LIMIT);
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

    // Filtro a nivel grupo (1 fila = 1 pedido).
    // ADR-006: tracking_number busca el global "BMK-" del grupo O el individual
    // "TRK-AR-" de cualquiera de sus shipments (el admin puede pegar cualquiera).
    const groupWhere: Prisma.ShipmentGroupWhereInput = {
      ...(trackingNumber && {
        OR: [
          { trackingNumber: { contains: trackingNumber, mode: "insensitive" } },
          {
            shipments: {
              some: {
                trackingNumber: {
                  contains: trackingNumber,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      }),
      ...(sellerProfileId && { shipments: { some: { sellerProfileId } } }),
      ...(orderIdFilter && { orderId: orderIdFilter }),
      ...(statusArr.length > 0 && {
        status: { in: statusArr as ShipmentStatus[] },
      }),
      ...((createdFrom || createdTo) && {
        createdAt: {
          ...(createdFrom && { gte: new Date(createdFrom) }),
          ...(createdTo && { lte: new Date(createdTo) }),
        },
      }),
    };

    const orderBy: Prisma.ShipmentGroupOrderByWithRelationInput =
      sortBy === "order_id"
        ? { orderId: sortDir }
        : { createdAt: sortDir };

    const [groups, total] = await Promise.all([
      prisma.shipmentGroup.findMany({
        where: groupWhere,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          shipments: {
            include: { packages: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.shipmentGroup.count({ where: groupWhere }),
    ]);

    const data = groups.map((g) =>
      toShipmentGroupDTOFromEntity(g, g.shipments),
    );

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        has_more: page * limit < total,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
