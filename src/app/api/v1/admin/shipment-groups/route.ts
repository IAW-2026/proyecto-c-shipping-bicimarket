// GET /api/v1/admin/shipment-groups — ADR-005
//
// Lista paginada por DISTINCT order_id. Cada item agrupa los N shipments de
// un pedido (uno por vendedor en órdenes multi-vendedor). La tabla admin de
// /admin/shipments usa este endpoint para mostrar 1 fila = 1 pedido.
//
// Filtros: idénticos al GET /api/v1/shipments admin (tracking_number, seller,
// order_id, status[], rango de fechas). Cada filtro se aplica a nivel
// shipment dentro de cada order_id — basta con que AL MENOS UN shipment del
// pedido matchee para que el grupo aparezca.
//
// Sort: solo por earliest_created_at (orden del shipment más temprano del
// grupo) y por order_id. Sort por status no aplica al grupo (se usa el
// rollup_status para mostrar).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toShipmentGroupDTO } from "@/lib/dto";
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

    // Filtro a nivel shipment. Un order_id matchea el filtro si tiene AL MENOS
    // UN shipment que cumple TODAS las condiciones.
    // ADR-005: tracking_number busca tanto en el tracking individual como en
    // el del pedido (orderTrackingNumber), porque el admin puede pegar
    // cualquiera de los dos.
    const shipmentWhere: Prisma.ShipmentWhereInput = {
      ...(trackingNumber && {
        OR: [
          { trackingNumber: { contains: trackingNumber, mode: "insensitive" } },
          {
            orderTrackingNumber: {
              contains: trackingNumber,
              mode: "insensitive",
            },
          },
        ],
      }),
      ...(sellerProfileId && { sellerProfileId }),
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

    // Página de order_ids: agrupamos por orderId con _min(createdAt) y
    // ordenamos por ese campo. Filtros se aplican antes del groupBy a nivel
    // shipment (cualquier shipment matcheado activa el order_id).
    //
    // sort_by=tracking_number / status no aplica al grupo — caen al default
    // de created_at para evitar confusión.
    const orderGroupsPromise =
      sortBy === "order_id"
        ? prisma.shipment.groupBy({
            by: ["orderId"],
            where: shipmentWhere,
            _min: { createdAt: true },
            orderBy: { orderId: sortDir },
            skip: (page - 1) * limit,
            take: limit,
          })
        : prisma.shipment.groupBy({
            by: ["orderId"],
            where: shipmentWhere,
            _min: { createdAt: true },
            orderBy: { _min: { createdAt: sortDir } },
            skip: (page - 1) * limit,
            take: limit,
          });

    const [orderGroups, totalGroups] = await Promise.all([
      orderGroupsPromise,
      prisma.shipment
        .groupBy({
          by: ["orderId"],
          where: shipmentWhere,
          _count: { orderId: true },
        })
        .then((rows) => rows.length),
    ]);

    const orderIds = orderGroups.map((g) => g.orderId);

    // Segunda query: traer TODOS los shipments de esos order_ids (sin filtro
    // de status para que el grupo muestre la composición completa). Si el
    // admin quería filtrar el grupo por status, ya filtró arriba — acá
    // hidratamos para mostrar el desglose.
    const shipmentsRaw = orderIds.length
      ? await prisma.shipment.findMany({
          where: { orderId: { in: orderIds } },
          include: { packages: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

    // Agrupar en memoria por orderId.
    const byOrder = new Map<string, typeof shipmentsRaw>();
    for (const s of shipmentsRaw) {
      const list = byOrder.get(s.orderId) ?? [];
      list.push(s);
      byOrder.set(s.orderId, list);
    }

    // Mantener el orden devuelto por groupBy (que ya está ordenado por sort).
    const data = orderIds
      .map((orderId) => {
        const shipments = byOrder.get(orderId);
        if (!shipments || shipments.length === 0) return null;
        return toShipmentGroupDTO(orderId, shipments);
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    return NextResponse.json({
      data,
      pagination: {
        total: totalGroups,
        page,
        limit,
        has_more: page * limit < totalGroups,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
