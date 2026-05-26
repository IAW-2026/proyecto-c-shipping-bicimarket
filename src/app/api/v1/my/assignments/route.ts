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
import {
  ShipmentStatus,
  AssignmentStatus,
} from "@/generated/prisma/enums";
import type { Shipment, Package } from "@/generated/prisma/client";

const ACTIVE_SHIPMENT_STATUSES = [
  ShipmentStatus.ready_for_pickup,
  ShipmentStatus.picked_up,
  ShipmentStatus.in_transit,
  ShipmentStatus.out_for_delivery,
];

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.assigned,
  AssignmentStatus.accepted,
  AssignmentStatus.picked_up,
];

type ShipmentWithPackages = Shipment & { packages: Package[] };

export async function GET(_req: NextRequest) {
  try {
    // Lectura permitida también para operadores suspended/inactive — la UI
    // los deja navegar/ver sus envíos pero deshabilita los botones de acción.
    // Las mutations (tracking-events, deliver…) siguen filtrando por active.
    const operator = await getOperatorRecord();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador requerido");
    }

    // Combinamos los dos sets en una sola query con OR.
    // (a) Asignados al operador con assignment activo, en cualquier estado activo.
    // (b) ready_for_pickup sin ningún assignment activo.
    const shipments = await prisma.shipment.findMany({
      where: {
        OR: [
          {
            status: { in: ACTIVE_SHIPMENT_STATUSES },
            assignments: {
              some: {
                operatorClerkUserId: operator.clerkUserId,
                status: { in: ACTIVE_ASSIGNMENT_STATUSES },
              },
            },
          },
          {
            status: ShipmentStatus.ready_for_pickup,
            assignments: {
              none: {
                status: { in: ACTIVE_ASSIGNMENT_STATUSES },
              },
            },
          },
        ],
      },
      orderBy: [
        // Los asignados a mí primero (más relevantes), después los disponibles.
        { createdAt: "desc" },
      ],
      include: {
        packages: true,
        assignments: {
          where: {
            operatorClerkUserId: operator.clerkUserId,
            status: { in: ACTIVE_ASSIGNMENT_STATUSES },
          },
          select: { id: true },
        },
      },
      take: 50,
    });

    const data = shipments.map((s) => {
      const { assignments, ...rest } = s;
      const isSelf = assignments.length > 0;
      return toAssignmentDTO(rest as ShipmentWithPackages, isSelf);
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
