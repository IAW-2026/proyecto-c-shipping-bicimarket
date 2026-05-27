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
import { patchShipmentStatusSchema } from "@/validation/shipments";
import { StatusHistorySource } from "@/generated/prisma/client";
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
      include: { packages: true },
    });
    if (!shipment) {
      throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");
    }

    return NextResponse.json(toShipmentDTO(shipment, shipment.packages));
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
        include: { packages: true },
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
