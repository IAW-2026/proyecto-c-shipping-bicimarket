// GET /api/v1/shipments/{shipmentId}/delivery-proof
// Devuelve la prueba de entrega del shipment (foto + nota + timestamp).
//
// Auth: JWT (admin o operador activo). Aceptamos ambos porque tanto el
// detalle admin como el detalle operador la consumen.
//
// Si el shipment no tiene proof (porque aún no fue entregado), devuelve 404.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getActiveOperator, requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import type { DeliveryProofDTO } from "@/types/delivery-proofs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Auth requerida");

    // Admin u operador activo (cualquiera de los dos puede ver)
    const admin = await requireAdmin(sessionClaims);
    if (!admin) {
      const operator = await getActiveOperator();
      if (!operator) {
        throw new ApiError("FORBIDDEN", 403, "Admin u operador activo requerido");
      }
    }

    const proof = await prisma.deliveryProof.findUnique({
      where: { shipmentId },
    });
    if (!proof) {
      throw new ApiError("NOT_FOUND", 404, "Sin prueba de entrega todavía");
    }

    const dto: DeliveryProofDTO = {
      id: proof.id,
      shipment_id: proof.shipmentId,
      proof_photo_url: proof.proofPhotoUrl,
      signature_image_url: proof.signatureImageUrl,
      note: proof.note,
      delivered_at: proof.deliveredAt.toISOString(),
      created_at: proof.createdAt.toISOString(),
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
