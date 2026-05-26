// GET /api/v1/track/{code} — PÚBLICO (sin auth)
// Devuelve el tracking de un envío para que cualquiera pueda consultarlo
// desde la pantalla /track/[code]. El `code` puede ser:
//   - El shipment_id completo (`shp_...`)
//   - El tracking_number (`TRK-AR-XXXXXXXX`)
//
// Está pensado para ser shareable: el comprador recibe un link y lo abre
// sin estar logueado. Por eso omite datos sensibles del DTO (ver
// `src/types/public-tracking.ts`).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api-error";
import type { PublicTrackingDTO } from "@/types/public-tracking";
import type { ShipmentStatus, ServiceLevel } from "@/types/shipments";
import type { TrackingEventType } from "@/types/tracking-events";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const trimmed = code.trim();

    if (!trimmed) {
      throw new ApiError("BAD_REQUEST", 400, "Código requerido");
    }

    // Match por id exacto o tracking_number (case-insensitive)
    const upper = trimmed.toUpperCase();
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { trackingNumber: upper },
        ],
      },
      include: {
        packages: { select: { id: true } },
        trackingEvents: { orderBy: { occurredAt: "asc" } },
        deliveryProof: true,
      },
    });

    if (!shipment) {
      throw new ApiError(
        "TRACKING_NOT_FOUND",
        404,
        "No encontramos un envío con ese código",
      );
    }

    const pickup = shipment.pickupAddressSnapshot as unknown as {
      city: string;
      province: string;
      postal_code: string;
    };
    const ship = shipment.shippingAddressSnapshot as unknown as {
      city: string;
      province: string;
      postal_code: string;
    };

    const dto: PublicTrackingDTO = {
      tracking_number: shipment.trackingNumber,
      shipment_id: shipment.id,
      status: shipment.status as ShipmentStatus,
      carrier: shipment.carrier,
      service_level: shipment.serviceLevel as ServiceLevel,
      origin: {
        city: pickup.city,
        province: pickup.province,
        postal_code: pickup.postal_code,
      },
      destination: {
        city: ship.city,
        province: ship.province,
        postal_code: ship.postal_code,
      },
      weight_grams_total: shipment.weightGramsTotal,
      packages_count: shipment.packages.length,
      created_at: shipment.createdAt.toISOString(),
      shipped_at: shipment.shippedAt?.toISOString() ?? null,
      delivered_at: shipment.deliveredAt?.toISOString() ?? null,
      events: shipment.trackingEvents.map((e) => ({
        event_type: e.eventType as TrackingEventType,
        location: e.location,
        note: e.note,
        occurred_at: e.occurredAt.toISOString(),
      })),
      ...(shipment.deliveryProof && {
        proof: {
          photo_url: shipment.deliveryProof.proofPhotoUrl,
          note: shipment.deliveryProof.note,
          delivered_at: shipment.deliveryProof.deliveredAt.toISOString(),
        },
      }),
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
