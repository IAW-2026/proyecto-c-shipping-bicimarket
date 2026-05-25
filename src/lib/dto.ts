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
import type { ShipmentDTO, ShipmentStatus, ServiceLevel } from "@/types/shipments";
import type { ShippingQuoteDTO } from "@/types/shipping-quotes";
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

export function toShipmentDTO(s: ShipmentModel, packages?: PackageModel[]): ShipmentDTO {
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

export function toAssignmentDTO(
  s: ShipmentModel & { packages: PackageModel[] },
): AssignmentDTO {
  return {
    id: s.id,
    tracking_number: s.trackingNumber,
    status: s.status as ShipmentStatus,
    pickup_address: s.pickupAddressSnapshot as unknown as Address,
    shipping_address: s.shippingAddressSnapshot as unknown as Address,
    weight_grams_total: s.weightGramsTotal,
    packages_count: s.packages.length,
  };
}
