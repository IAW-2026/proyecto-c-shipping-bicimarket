// GET   /api/v1/shipments/{shipmentId} — SH2 detail (JWT o S2S, docs/03)
// PATCH /api/v1/shipments/{shipmentId} — SH2 patchStatus (JWT admin/logistics)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { requireAdmin, getActiveOperator } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { generateId } from "@/lib/ids";
import { toShipmentDTO } from "@/lib/dto";
import { recomputeGroupStatus } from "@/lib/group-status";
import { patchShipmentStatusSchema } from "@/validation/shipments";
import { StatusHistorySource } from "@/generated/prisma/client";
import type { Address } from "@/types/common";
import type {
  OrderPickupSummary,
  ShipmentStatus,
} from "@/types/shipments";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    // Acepta S2S o JWT (admin o cualquier logueado)
    const s2sDenied = requireServiceToken(req);
    if (s2sDenied) {
      const { userId } = await auth();
      if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        packages: true,
        group: { select: { trackingNumber: true } },
      },
    });
    if (!shipment) {
      throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");
    }

    // ADR-006: hidratar TODOS los pickups del mismo pedido (grupo), incluido
    // este shipment, para que la UI del operador renderice el diagrama de flujo
    // multi-vendedor sin round-trips extra. length===1 si es single.
    const orderShipments = await prisma.shipment.findMany({
      where: { shipmentGroupId: shipment.shipmentGroupId },
      select: {
        id: true,
        trackingNumber: true,
        sellerProfileId: true,
        status: true,
        pickupAddressSnapshot: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const orderPickups: OrderPickupSummary[] = orderShipments.map((s) => {
      const addr = s.pickupAddressSnapshot as unknown as Address;
      return {
        shipment_id: s.id,
        tracking_number: s.trackingNumber,
        pickup_city: addr.city,
        seller_profile_id: s.sellerProfileId,
        status: s.status as ShipmentStatus,
      };
    });

    return NextResponse.json(
      toShipmentDTO(shipment, shipment.packages, orderPickups),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    // Solo JWT (admin u operador). Sin modo S2S — esto es override manual.
    const { userId, sessionClaims } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");

    const admin = await requireAdmin(sessionClaims);
    const operator = admin ? null : await getActiveOperator();
    if (!admin && !operator) {
      throw new ApiError("FORBIDDEN", 403, "Admin u operador activo requerido");
    }

    const body = patchShipmentStatusSchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.shipment.findUnique({
        where: { id: shipmentId },
      });
      if (!current) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

      // Override admin: no aplicamos assertTransition acá porque es para
      // correcciones. El audit registra el cambio igual.
      const next = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: body.status },
        include: {
          packages: true,
          group: { select: { trackingNumber: true } },
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId,
          fromStatus: current.status,
          toStatus: body.status,
          source: admin
            ? StatusHistorySource.admin
            : StatusHistorySource.logistics,
          payload: body.note ? { note: body.note } : undefined,
          occurredAt: new Date(),
        },
      });

      // ADR-006: el override manual también recomputa el rollup del pedido.
      await recomputeGroupStatus(tx, next.shipmentGroupId);

      return next;
    });

    logger.info({
      msg: "shipment.status patched manually",
      shipmentId,
      newStatus: body.status,
      by: admin ? "admin" : "logistics",
      userId,
    });

    return NextResponse.json(toShipmentDTO(updated, updated.packages));
  } catch (err) {
    return handleApiError(err);
  }
}
