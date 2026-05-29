// GET /api/v1/my/deliveries — historial de entregas finalizadas del operador
// logueado. Devuelve assignments con status=delivered, ordenados por
// completedAt desc, paginados. Consumido por /dashboard/profile para que el
// operador vea qué envíos completó (no aparecen más en /assignments activos).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperatorRecord } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { ShipmentStatus } from "@/generated/prisma/client";
import type { Shipment, Package } from "@/generated/prisma/client";
import type { MyDeliveryDTO } from "@/types/assignments";
import type { Address, PaginatedResponse } from "@/types/common";
import type { ServiceLevel } from "@/types/shipments";

type ShipmentWithGroupAndPackages = Shipment & {
  packages: Package[];
  group: { trackingNumber: string };
};

export async function GET(req: NextRequest) {
  try {
    // Lectura permitida también para suspended/inactive — es histórico,
    // no requiere status active.
    const operator = await getOperatorRecord();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador requerido");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );

    // ADR-006: la asignación es a nivel pedido. El historial del operador son
    // los shipments entregados de los pedidos que él tomó (group dueño = él).
    const where = {
      status: ShipmentStatus.delivered,
      group: { assignedOperatorClerkUserId: operator.clerkUserId },
    };

    const [rows, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { deliveredAt: "desc" },
        include: {
          packages: true,
          group: { select: { trackingNumber: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    const data: MyDeliveryDTO[] = (rows as ShipmentWithGroupAndPackages[]).map(
      (s) => ({
        id: s.id,
        shipment_id: s.id,
        tracking_number: s.trackingNumber,
        order_tracking_number: s.group.trackingNumber,
        order_id: s.orderId,
        delivered_at: (s.deliveredAt ?? s.updatedAt).toISOString(),
        shipping_address: s.shippingAddressSnapshot as unknown as Address,
        weight_grams_total: s.weightGramsTotal,
        packages_count: s.packages.length,
        carrier: s.carrier,
        service_level: s.serviceLevel as ServiceLevel,
      }),
    );

    const body: PaginatedResponse<MyDeliveryDTO> = {
      data,
      pagination: {
        total,
        page,
        limit,
        has_more: page * limit < total,
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    return handleApiError(err);
  }
}
