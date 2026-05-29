// Mappers de modelos Prisma (camelCase, Date objects) a DTOs canónicos
// (snake_case, ISO strings) que devolvemos en la API. Vive acá para reusarse
// entre route handlers sin acoplar tipos de UI al cliente Prisma generado.

import type {
  Shipment as ShipmentModel,
  ShippingQuote as ShippingQuoteModel,
  LogisticsOperator as LogisticsOperatorModel,
  TrackingEvent as TrackingEventModel,
  Package as PackageModel,
} from "@/generated/prisma/client";
import type {
  ShipmentDTO,
  ShipmentStatus,
  ServiceLevel,
  OrderPickupSummary,
} from "@/types/shipments";
import type { ShippingQuoteDTO, QuoteResponseDTO } from "@/types/shipping-quotes";
import type {
  ShipmentGroupAggregate,
  ShipmentGroupDTO,
} from "@/types/shipment-groups";
import { rollupShipmentStatus } from "@/lib/shipment-rollup";

export { rollupShipmentStatus };
import type { LogisticsOperatorDTO, VehicleType, OperatorStatus } from "@/types/logistics-operators";
import type { TrackingEventDTO, TrackingEventType } from "@/types/tracking-events";
import type { PackageDTO } from "@/types/packages";
import type { AssignmentDTO } from "@/types/assignments";
import type { Address } from "@/types/common";

export function toPackageDTO(p: PackageModel): PackageDTO {
  return {
    id: p.id,
    weight_grams: p.weightGrams,
    length_cm: p.lengthCm,
    width_cm: p.widthCm,
    height_cm: p.heightCm,
    description: p.description,
    label_url: p.labelUrl,
  };
}

export function toShipmentDTO(
  s: ShipmentModel,
  packages?: PackageModel[],
  orderPickups?: OrderPickupSummary[],
): ShipmentDTO {
  return {
    id: s.id,
    order_id: s.orderId,
    order_seller_group_id: s.orderSellerGroupId,
    sales_order_id: s.salesOrderId,
    seller_profile_id: s.sellerProfileId,
    buyer_profile_id: s.buyerProfileId,
    carrier: s.carrier,
    service_level: s.serviceLevel as ServiceLevel,
    tracking_number: s.trackingNumber,
    order_tracking_number: s.orderTrackingNumber,
    label_url: s.labelUrl,
    status: s.status as ShipmentStatus,
    weight_grams_total: s.weightGramsTotal,
    cost_cents: s.costCents,
    currency: "ARS",
    shipping_address_snapshot: s.shippingAddressSnapshot as unknown as Address,
    pickup_address_snapshot: s.pickupAddressSnapshot as unknown as Address,
    shipped_at: s.shippedAt?.toISOString() ?? null,
    delivered_at: s.deliveredAt?.toISOString() ?? null,
    created_at: s.createdAt.toISOString(),
    ...(packages !== undefined && { packages: packages.map(toPackageDTO) }),
    ...(orderPickups !== undefined && { order_pickups: orderPickups }),
  };
}

export function toShippingQuoteDTO(q: ShippingQuoteModel): ShippingQuoteDTO {
  return {
    id: q.id,
    seller_profile_id: q.sellerProfileId,
    service_level: q.serviceLevel as ServiceLevel,
    carrier: q.carrier,
    cost_cents: q.costCents,
    currency: "ARS",
    estimated_days_min: q.estimatedDaysMin,
    estimated_days_max: q.estimatedDaysMax,
    weight_grams_total: q.weightGramsTotal,
    packages_count: q.packagesCount,
    expires_at: q.expiresAt.toISOString(),
  };
}

/**
 * Envuelve N ShippingQuote en el shape unificado de POST /shipping-quotes
 * (ADR-005). Tanto el caso single-origen (N=1, discount=0) como el multi
 * comparten esta forma.
 */
export function toQuoteResponseDTO(input: {
  quotes: ShippingQuoteModel[];
  originsCount: number;
  discountPct: number;
  totalGrossCents: number;
  totalNetCents: number;
}): QuoteResponseDTO {
  return {
    origins_count: input.originsCount,
    discount_pct: input.discountPct,
    total_gross_cents: input.totalGrossCents,
    total_net_cents: input.totalNetCents,
    currency: "ARS",
    quotes: input.quotes.map(toShippingQuoteDTO),
  };
}

export function toLogisticsOperatorDTO(op: LogisticsOperatorModel): LogisticsOperatorDTO {
  return {
    id: op.id,
    clerk_user_id: op.clerkUserId,
    full_name: op.fullName,
    email: op.email,
    phone: op.phone,
    document_id: op.documentId,
    vehicle_type: op.vehicleType as VehicleType,
    license_plate: op.licensePlate,
    status: op.status as OperatorStatus,
    created_at: op.createdAt.toISOString(),
  };
}

export function toTrackingEventDTO(e: TrackingEventModel): TrackingEventDTO {
  return {
    id: e.id,
    event_type: e.eventType as TrackingEventType,
    location: e.location,
    note: e.note,
    occurred_at: e.occurredAt.toISOString(),
  };
}

export function toShipmentGroupDTO(
  orderId: string,
  shipmentsWithPackages: Array<ShipmentModel & { packages: PackageModel[] }>,
): ShipmentGroupDTO {
  if (shipmentsWithPackages.length === 0) {
    throw new Error("toShipmentGroupDTO: shipmentsWithPackages no puede estar vacío");
  }

  const sorted = [...shipmentsWithPackages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const first = sorted[0];

  const statuses = sorted.map((s) => s.status as ShipmentStatus);
  const statusBreakdown: Partial<Record<ShipmentStatus, number>> = {};
  for (const s of statuses) {
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1;
  }

  const aggregate: ShipmentGroupAggregate = {
    order_tracking_number: first.orderTrackingNumber,
    origins_count: sorted.length,
    unique_sellers: Array.from(new Set(sorted.map((s) => s.sellerProfileId))),
    total_weight_grams: sorted.reduce((sum, s) => sum + s.weightGramsTotal, 0),
    total_cost_cents: sorted.reduce((sum, s) => sum + s.costCents, 0),
    currency: "ARS",
    status_breakdown: statusBreakdown,
    rollup_status: rollupShipmentStatus(statuses),
    service_level: first.serviceLevel as ServiceLevel,
    shipping_address: first.shippingAddressSnapshot as unknown as Address,
    buyer_profile_id: first.buyerProfileId,
    earliest_created_at: first.createdAt.toISOString(),
  };

  return {
    order_id: orderId,
    aggregate,
    shipments: sorted.map((s) => toShipmentDTO(s, s.packages)),
  };
}

export function toAssignmentDTO(
  s: ShipmentModel & { packages: PackageModel[] },
  isSelfAssigned: boolean,
): AssignmentDTO {
  return {
    id: s.id,
    order_id: s.orderId,
    seller_profile_id: s.sellerProfileId,
    tracking_number: s.trackingNumber,
    order_tracking_number: s.orderTrackingNumber,
    status: s.status as ShipmentStatus,
    pickup_address: s.pickupAddressSnapshot as unknown as Address,
    shipping_address: s.shippingAddressSnapshot as unknown as Address,
    weight_grams_total: s.weightGramsTotal,
    packages_count: s.packages.length,
    is_self_assigned: isSelfAssigned,
  };
}
