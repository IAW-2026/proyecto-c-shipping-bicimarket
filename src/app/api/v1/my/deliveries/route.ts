// GET /api/v1/my/deliveries — historial de entregas finalizadas del operador
// logueado. Devuelve assignments con status=delivered, ordenados por
// completedAt desc, paginados. Consumido por /dashboard/profile para que el
// operador vea qué envíos completó (no aparecen más en /assignments activos).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperatorRecord } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { AssignmentStatus } from "@/generated/prisma/client";
import type {
  DeliveryAssignment,
  Shipment,
  Package,
} from "@/generated/prisma/client";
import type { MyDeliveryDTO } from "@/types/assignments";
import type { Address, PaginatedResponse } from "@/types/common";
import type { ServiceLevel } from "@/types/shipments";

type AssignmentWithShipment = DeliveryAssignment & {
  shipment: Shipment & { packages: Package[] };
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

    const where = {
      operatorClerkUserId: operator.clerkUserId,
      status: AssignmentStatus.delivered,
    };

    const [rows, total] = await Promise.all([
      prisma.deliveryAssignment.findMany({
        where,
        orderBy: { completedAt: "desc" },
        include: { shipment: { include: { packages: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deliveryAssignment.count({ where }),
    ]);

    const data: MyDeliveryDTO[] = (rows as AssignmentWithShipment[]).map(
      (a) => ({
        id: a.id,
        shipment_id: a.shipmentId,
        tracking_number: a.shipment.trackingNumber,
        order_tracking_number: a.shipment.orderTrackingNumber,
        order_id: a.shipment.orderId,
        // completedAt está garantizado en delivered (lo setea POST /deliver),
        // pero el schema lo permite nullable → fallback a updatedAt por las dudas.
        delivered_at: (a.completedAt ?? a.updatedAt).toISOString(),
        shipping_address: a.shipment.shippingAddressSnapshot as unknown as Address,
        weight_grams_total: a.shipment.weightGramsTotal,
        packages_count: a.shipment.packages.length,
        carrier: a.shipment.carrier,
        service_level: a.shipment.serviceLevel as ServiceLevel,
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
