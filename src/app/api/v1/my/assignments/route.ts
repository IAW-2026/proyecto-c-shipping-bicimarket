// GET /api/v1/my/assignments — SH5 my (JWT logistics, docs/03)
//
// Devuelve dos clases de envíos para el operador logueado:
//   (a) Asignados a él → assignments.some({ operatorClerkUserId: me, ... })
//   (b) Disponibles    → ready_for_pickup sin ningún assignment activo
//
// El operador puede auto-asignárselos al tocar "Ir a retirar" (lo hace el
// POST /tracking-events con event_type=picked_up, que crea el assignment
// transparentemente si no existe).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperatorRecord } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { toAssignmentDTO } from "@/lib/dto";
import { ShipmentStatus } from "@/generated/prisma/client";
import type { Shipment, Package } from "@/generated/prisma/client";

const ACTIVE_SHIPMENT_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
];

type ShipmentWithGroupAndPackages = Shipment & {
  packages: Package[];
  group: { trackingNumber: string; assignedOperatorClerkUserId: string | null };
};

export async function GET(_req: NextRequest) {
  try {
    // Lectura permitida también para operadores suspended/inactive — la UI
    // los deja navegar/ver sus envíos pero deshabilita los botones de acción.
    // Las mutations (tracking-events, deliver…) siguen filtrando por active.
    const operator = await getOperatorRecord();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador requerido");
    }

    // ADR-006: la asignación es a nivel PEDIDO (ShipmentGroup). Combinamos:
    // (a) shipments de pedidos asignados al operador (group.assignedOperator = yo).
    // (b) shipments ready_for_pickup de pedidos que nadie tomó (group sin dueño).
    const shipments = await prisma.shipment.findMany({
      where: {
        OR: [
          {
            status: { in: ACTIVE_SHIPMENT_STATUSES },
            group: { assignedOperatorClerkUserId: operator.clerkUserId },
          },
          {
            status: ShipmentStatus.ready_for_pickup,
            group: { assignedOperatorClerkUserId: null },
          },
        ],
      },
      orderBy: [
        // Los asignados a mí primero (más relevantes), después los disponibles.
        { createdAt: "desc" },
      ],
      include: {
        packages: true,
        group: {
          select: { trackingNumber: true, assignedOperatorClerkUserId: true },
        },
      },
      take: 50,
    });

    const data = (shipments as ShipmentWithGroupAndPackages[]).map((s) => {
      const isSelf =
        s.group.assignedOperatorClerkUserId === operator.clerkUserId;
      return toAssignmentDTO(s, isSelf);
    });

    // Self primero, después disponibles. Dentro de cada grupo respeta createdAt desc.
    data.sort((a, b) => {
      if (a.is_self_assigned !== b.is_self_assigned) {
        return a.is_self_assigned ? -1 : 1;
      }
      return 0;
    });

    return NextResponse.json({
      data,
      pagination: {
        total: data.length,
        page: 1,
        limit: data.length,
        has_more: false,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
