// GET /api/v1/track/{code} — PÚBLICO (sin auth)
// Devuelve el tracking de un envío para que cualquiera pueda consultarlo
// desde la pantalla /track/[code]. El `code` puede ser:
//   - El shipment_id completo (`shp_...`)
//   - El tracking_number del pickup individual (`TRK-AR-XXXXXXXX`)
//   - El order_tracking_number del pedido completo (`TRK-AR-XXXXXXXX`)
//     (ADR-005: Buyer expone solo este; comparte tracking entre N shipments).
//
// Está pensado para ser shareable: el comprador recibe un link y lo abre
// sin estar logueado. Por eso omite datos sensibles del DTO (ver
// `src/types/public-tracking.ts`).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api-error";
import type { PublicTrackingDTO } from "@/types/public-tracking";
import type {
  ShipmentStatus,
  ServiceLevel,
  OrderPickupSummary,
} from "@/types/shipments";
import type { TrackingEventType } from "@/types/tracking-events";
import type { Address } from "@/types/common";

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

    // Match por id exacto, tracking_number individual u order_tracking_number
    // (case-insensitive). El comprador típicamente recibe el order_tracking,
    // que puede mapear a N shipments del mismo pedido — devolvemos el más
    // temprano de esos como representante (la versión multi-vendedor del
    // tracking público es follow-up de ADR-005).
    const upper = trimmed.toUpperCase();
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { trackingNumber: upper },
          { orderTrackingNumber: upper },
        ],
      },
      orderBy: { createdAt: "asc" },
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

    // Si el código entrante era el order_tracking_number, ese es el que el
    // comprador vio y espera ver de vuelta. Si era el tracking individual,
    // devolvemos ese. Si era el shipment_id o no lo sabemos, defaulteamos al
    // tracking del pedido (más amigable para el comprador).
    const matchedByIndividual = shipment.trackingNumber === upper;
    const trackingToReturn = matchedByIndividual
      ? shipment.trackingNumber
      : shipment.orderTrackingNumber;

    // ADR-005: hidratamos TODOS los pickups del pedido para que la UI pueda
    // renderizar el flow multi-vendedor sin round-trips extra.
    const orderShipments = await prisma.shipment.findMany({
      where: { orderId: shipment.orderId },
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

    const dto: PublicTrackingDTO = {
      tracking_number: trackingToReturn,
      order_tracking_number: shipment.orderTrackingNumber,
      order_pickups_count: orderPickups.length,
      order_pickups: orderPickups,
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
