// POST /api/v1/shipments — SH2 create (S2S Seller, docs/03)
// GET  /api/v1/shipments — SH2 list:
//   - S2S Buyer con ?orderId=X
//   - JWT admin con filtros (?status[]=&seller_profile_id=&created_at_from=...)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId, generateTrackingNumber } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { paginate } from "@/lib/pagination";
import { toShipmentDTO } from "@/lib/dto";
import { createShipmentSchema } from "@/validation/shipments";
import { ShipmentStatus, TrackingEventType, StatusHistorySource } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const denied = requireServiceToken(req);
    if (denied) return denied;

    const body = createShipmentSchema.parse(await req.json());
    const idempotencyKey = req.headers.get("idempotency-key");

    if (idempotencyKey) {
      const existing = await prisma.shipment.findUnique({
        where: { idempotencyKey },
        include: { packages: true },
      });
      if (existing) {
        return NextResponse.json(toShipmentDTO(existing, existing.packages));
      }
    }

    // Validar quote no vencida
    const quote = await prisma.shippingQuote.findUnique({
      where: { id: body.shipping_quote_id },
    });
    if (!quote) {
      throw new ApiError("NOT_FOUND", 404, "Cotización inexistente");
    }
    if (quote.expiresAt.getTime() < Date.now()) {
      throw new ApiError("QUOTE_EXPIRED", 409, "La cotización venció", {
        quote_id: quote.id,
        expires_at: quote.expiresAt.toISOString(),
      });
    }

    // Un solo shipment por sales_order
    const dup = await prisma.shipment.findFirst({
      where: { salesOrderId: body.sales_order_id },
      select: { id: true },
    });
    if (dup) {
      throw new ApiError(
        "SHIPMENT_ALREADY_EXISTS",
        409,
        "Ya existe un shipment para este sales_order",
        { existing_shipment_id: dup.id },
      );
    }

    const shipmentId = generateId("shp");
    const trackingNumber = generateTrackingNumber();

    // ADR-005: el tracking del PEDIDO se comparte entre todos los Shipment del
    // mismo order_id. Si ya existe algún sibling, reusamos el suyo; si es el
    // primer shipment de este order_id, generamos uno nuevo. Buyer expone solo
    // este; operador/admin ven ambos.
    const existingSibling = await prisma.shipment.findFirst({
      where: { orderId: body.order_id },
      select: { orderTrackingNumber: true },
    });
    const orderTrackingNumber =
      existingSibling?.orderTrackingNumber ?? generateTrackingNumber();

    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          id: shipmentId,
          orderId: body.order_id,
          orderSellerGroupId: body.order_seller_group_id,
          salesOrderId: body.sales_order_id,
          sellerProfileId: body.seller_profile_id,
          buyerProfileId: body.buyer_profile_id,
          shippingQuoteId: quote.id,
          carrier: quote.carrier,
          serviceLevel: quote.serviceLevel,
          trackingNumber,
          orderTrackingNumber,
          labelUrl: "/labels/sample.pdf", // sprint 1 placeholder
          status: ShipmentStatus.ready_for_pickup,
          weightGramsTotal: quote.weightGramsTotal,
          costCents: quote.costCents,
          shippingAddressSnapshot: body.shipping_address_snapshot as unknown as object,
          pickupAddressSnapshot: quote.fromAddressSnapshot as object,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      const packagesCreated = await Promise.all(
        body.packages.map((p) =>
          tx.package.create({
            data: {
              id: generateId("pkg"),
              shipmentId: shipment.id,
              weightGrams: p.weight_grams,
              lengthCm: p.length_cm,
              widthCm: p.width_cm,
              heightCm: p.height_cm,
              description: p.description ?? null,
            },
          }),
        ),
      );

      // Audit + tracking events iniciales
      await tx.trackingEvent.createMany({
        data: [
          {
            id: generateId("evt"),
            shipmentId: shipment.id,
            eventType: TrackingEventType.created,
            occurredAt: shipment.createdAt,
          },
          {
            id: generateId("evt"),
            shipmentId: shipment.id,
            eventType: TrackingEventType.ready_for_pickup,
            occurredAt: shipment.createdAt,
          },
        ],
      });
      await tx.shipmentStatusHistory.create({
        data: {
          id: generateId("ssh"),
          shipmentId: shipment.id,
          fromStatus: ShipmentStatus.created,
          toStatus: ShipmentStatus.ready_for_pickup,
          source: StatusHistorySource.system,
          occurredAt: shipment.createdAt,
        },
      });

      return { shipment, packagesCreated };
    });

    return NextResponse.json(
      toShipmentDTO(result.shipment, result.packagesCreated),
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    // Modo S2S Buyer: requiere ?orderId
    const s2sDenied = requireServiceToken(req);
    if (!s2sDenied) {
      if (!orderId) {
        throw new ApiError(
          "BAD_REQUEST",
          400,
          "El llamado S2S requiere ?orderId=X",
        );
      }
      const result = await paginate(
        prisma.shipment,
        {
          where: { orderId },
          orderBy: { createdAt: "desc" },
          include: { packages: true },
        },
        {
          page: Number(searchParams.get("page") ?? 1),
          limit: Number(searchParams.get("limit") ?? 20),
        },
      );
      return NextResponse.json({
        data: result.data.map((s) =>
          toShipmentDTO(s as never, (s as { packages: never[] }).packages),
        ),
        pagination: result.pagination,
      });
    }

    // Modo JWT admin: filtros ricos para la tabla admin
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const trackingNumber = searchParams.get("tracking_number");
    const sellerProfileId = searchParams.get("seller_profile_id");
    const orderIdFilter = searchParams.get("order_id");
    const statusArr = searchParams.getAll("status[]");
    const createdFrom = searchParams.get("created_at_from");
    const createdTo = searchParams.get("created_at_to");
    const sortBy = searchParams.get("sort_by") ?? "created_at";
    const sortDir = (searchParams.get("sort_dir") ?? "desc") as "asc" | "desc";

    const where: Prisma.ShipmentWhereInput = {
      ...(trackingNumber && {
        trackingNumber: { contains: trackingNumber, mode: "insensitive" },
      }),
      ...(sellerProfileId && { sellerProfileId }),
      ...(orderIdFilter && { orderId: orderIdFilter }),
      ...(statusArr.length > 0 && {
        status: { in: statusArr as ShipmentStatus[] },
      }),
      ...((createdFrom || createdTo) && {
        createdAt: {
          ...(createdFrom && { gte: new Date(createdFrom) }),
          ...(createdTo && { lte: new Date(createdTo) }),
        },
      }),
    };

    const sortColumn: Record<string, string> = {
      created_at: "createdAt",
      tracking_number: "trackingNumber",
      status: "status",
    };

    const result = await paginate(
      prisma.shipment,
      {
        where,
        orderBy: { [sortColumn[sortBy] ?? "createdAt"]: sortDir },
        include: { packages: true },
      },
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("per_page") ?? 20),
      },
    );

    return NextResponse.json({
      data: result.data.map((s) =>
        toShipmentDTO(s as never, (s as { packages: never[] }).packages),
      ),
      pagination: result.pagination,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
