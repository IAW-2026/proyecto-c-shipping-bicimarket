// GET /api/v1/track/{code} — PÚBLICO (sin auth)
// Devuelve el tracking de un envío para que cualquiera pueda consultarlo
// desde la pantalla /track/[code]. El `code` puede ser (ADR-006):
//   - El tracking GLOBAL del pedido (`BMK-XXXXXXXXXX`) o el group_id (`grp_...`)
//     → es el que ve el comprador; resuelve el pedido completo.
//   - El tracking individual de un vendedor (`TRK-AR-XXXXXXXX`) o el
//     shipment_id (`shp_...`) → resuelve ese envío puntual.
//
// En ambos casos devolvemos el tracking global del pedido + el resumen de
// todos sus pickups (order_pickups) para renderizar el flow multi-vendedor.
//
// Está pensado para ser shareable: el comprador recibe un link y lo abre
// sin estar logueado. Por eso omite datos sensibles del DTO (ver
// `src/types/public-tracking.ts`).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api-error";
import type {
  PublicTrackingDTO,
  PublicTrackingProof,
} from "@/types/public-tracking";
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

    // ADR-006: el código global del pedido es "BMK-…" (o el group_id "grp_…").
    // Si es global, resolvemos el grupo y mostramos su pickup más temprano como
    // representante. Si es individual ("TRK-AR-…" o "shp_…"), resolvemos ese
    // envío. En ambos casos el order_tracking_number sale del grupo.
    const upper = trimmed.toUpperCase();
    // ADR-006: dos vistas según el código:
    //  - VISTA PEDIDO (comprador): el código es el global "BMK-…" (o "grp_…").
    //    Muestra el pedido completo: todos los envíos de todos los vendedores +
    //    el estado consolidado (rollup) del pedido.
    //  - VISTA ENVÍO (vendedor): el código es el individual "TRK-AR-…" (o
    //    "shp_…"). Muestra SOLO ese envío — un vendedor no ve los envíos de
    //    otros vendedores del mismo pedido (aislamiento).
    const isOrderView = upper.startsWith("BMK-") || trimmed.startsWith("grp_");

    let shipmentGroupId: string | null = null;
    let groupStatus: ShipmentStatus | null = null;
    let groupTrackingNumber: string | null = null;
    if (isOrderView) {
      const group = await prisma.shipmentGroup.findFirst({
        where: { OR: [{ id: trimmed }, { trackingNumber: upper }] },
        select: { id: true, status: true, trackingNumber: true },
      });
      if (!group) {
        throw new ApiError(
          "TRACKING_NOT_FOUND",
          404,
          "No encontramos un pedido con ese código",
        );
      }
      shipmentGroupId = group.id;
      groupStatus = group.status as ShipmentStatus;
      groupTrackingNumber = group.trackingNumber;
    }

    const shipment = await prisma.shipment.findFirst({
      where: shipmentGroupId
        ? { shipmentGroupId }
        : { OR: [{ id: trimmed }, { trackingNumber: upper }] },
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

    let trackingToReturn: string;
    let orderTrackingToReturn: string;
    let statusToReturn: ShipmentStatus;
    let orderPickups: OrderPickupSummary[];
    // ADR-006: la vista PEDIDO junta una prueba por cada vendedor que entregó;
    // la vista ENVÍO tiene a lo sumo una (es atómica).
    let proofs: PublicTrackingProof[];

    if (isOrderView && shipmentGroupId) {
      // Vista PEDIDO: tracking global + estado consolidado + todos los pickups.
      trackingToReturn = groupTrackingNumber as string;
      orderTrackingToReturn = groupTrackingNumber as string;
      statusToReturn = (groupStatus ?? (shipment.status as ShipmentStatus));
      const orderShipments = await prisma.shipment.findMany({
        where: { shipmentGroupId },
        select: {
          id: true,
          trackingNumber: true,
          sellerProfileId: true,
          status: true,
          pickupAddressSnapshot: true,
          createdAt: true,
          deliveryProof: {
            select: { proofPhotoUrl: true, note: true, deliveredAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      orderPickups = orderShipments.map((s) => {
        const addr = s.pickupAddressSnapshot as unknown as Address;
        return {
          shipment_id: s.id,
          tracking_number: s.trackingNumber,
          pickup_city: addr.city,
          seller_profile_id: s.sellerProfileId,
          status: s.status as ShipmentStatus,
        };
      });
      proofs = orderShipments
        .filter((s) => s.deliveryProof)
        .map((s) => ({
          photo_url: s.deliveryProof!.proofPhotoUrl,
          note: s.deliveryProof!.note,
          delivered_at: s.deliveryProof!.deliveredAt.toISOString(),
          seller_profile_id: s.sellerProfileId,
          tracking_number: s.trackingNumber,
        }));
    } else {
      // Vista ENVÍO: solo este envío. No exponemos el pedido ni los otros
      // vendedores — el vendedor ve únicamente su propio flujo.
      trackingToReturn = shipment.trackingNumber;
      orderTrackingToReturn = shipment.trackingNumber;
      statusToReturn = shipment.status as ShipmentStatus;
      orderPickups = [
        {
          shipment_id: shipment.id,
          tracking_number: shipment.trackingNumber,
          pickup_city: pickup.city,
          seller_profile_id: shipment.sellerProfileId,
          status: shipment.status as ShipmentStatus,
        },
      ];
      proofs = shipment.deliveryProof
        ? [
            {
              photo_url: shipment.deliveryProof.proofPhotoUrl,
              note: shipment.deliveryProof.note,
              delivered_at: shipment.deliveryProof.deliveredAt.toISOString(),
            },
          ]
        : [];
    }

    const dto: PublicTrackingDTO = {
      view: isOrderView ? "order" : "shipment",
      tracking_number: trackingToReturn,
      order_tracking_number: orderTrackingToReturn,
      order_pickups_count: orderPickups.length,
      order_pickups: orderPickups,
      shipment_id: shipment.id,
      status: statusToReturn,
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
      proofs,
    };

    return NextResponse.json(dto);
  } catch (err) {
    return handleApiError(err);
  }
}
