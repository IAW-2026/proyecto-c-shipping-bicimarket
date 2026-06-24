// GET /api/v1/shipments/{shipmentId}/status-history — historial de cambios
// de status del shipment. Auth: JWT admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import type { ShipmentStatusHistoryDTO } from "@/types/shipment-status-history";
import type { ShipmentStatus } from "@/types/shipments";
import type { StatusHistorySource } from "@/types/shipment-status-history";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const rows = await prisma.shipmentStatusHistory.findMany({
      where: { shipmentId },
      orderBy: { occurredAt: "desc" },
    });

    const data: ShipmentStatusHistoryDTO[] = rows.map((r) => ({
      id: r.id,
      from_status: r.fromStatus as ShipmentStatus,
      to_status: r.toStatus as ShipmentStatus,
      source: r.source as StatusHistorySource,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      occurred_at: r.occurredAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
