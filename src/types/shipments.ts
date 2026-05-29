import type { ShipmentStatus as PrismaShipmentStatus } from "@/generated/prisma/client";
import type { Address } from "./common";
import type { PackageDTO } from "./packages";

// String literal union replicado del enum Prisma. Se replica acá para que
// src/types/ no acople a @/generated/prisma — los componentes del frontend
// pueden importar tipos sin tirar del cliente Prisma generado.
// El _check de abajo garantiza equivalencia con el enum DB en compile time.
export type ShipmentStatus =
  | "created"
  | "ready_for_pickup"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned";

// Compile-time guard: si Prisma agrega/quita un valor del enum, esto rompe.
type _checkShipmentStatus = [PrismaShipmentStatus] extends [ShipmentStatus]
  ? [ShipmentStatus] extends [PrismaShipmentStatus]
    ? true
    : never
  : never;
export const _shipmentStatusCheck: _checkShipmentStatus = true;

export type ServiceLevel = "standard" | "express" | "same_day";

/**
 * Shape del shipment que devuelve nuestra API (docs/03 §SH2). snake_case en
 * la wire por convención REST; los modelos internos de Prisma usan camelCase
 * y se mapean en el route handler.
 */
export interface ShipmentDTO {
  id: string;
  order_id: string;
  order_seller_group_id: string;
  sales_order_id: string;
  seller_profile_id: string;
  buyer_profile_id: string;
  carrier: string;
  service_level: ServiceLevel;
  /** Tracking individual del pickup (este shipment). Operador/admin lo usan. */
  tracking_number: string;
  /**
   * ADR-005: tracking del pedido entero (compartido por todos los shipments
   * con el mismo order_id). El Buyer expone solo este.
   */
  order_tracking_number: string;
  label_url: string;
  status: ShipmentStatus;
  weight_grams_total: number;
  cost_cents: number;
  currency: "ARS";
  shipping_address_snapshot: Address;
  pickup_address_snapshot: Address;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  packages?: PackageDTO[];
  /**
   * ADR-005: resumen de TODOS los pickups del mismo `order_id` (incluido
   * este shipment). Para single-origen `length === 1`. Permite a la UI
   * renderizar el diagrama de flujo multi-vendedor sin round-trips extra.
   */
  order_pickups?: OrderPickupSummary[];
}

/**
 * Resumen mínimo de un pickup (1 shipment = 1 vendedor) dentro del pedido.
 * Usado por el diagrama de flujo del operador y la pantalla pública de
 * tracking. Excluye datos sensibles para que el mismo type sirva en ambos.
 */
export interface OrderPickupSummary {
  shipment_id: string;
  tracking_number: string;
  pickup_city: string;
  seller_profile_id: string;
  status: ShipmentStatus;
}

/** Body de POST /api/v1/shipments (S2S Seller, docs/03 §SH2 create). */
export interface CreateShipmentBody {
  shipping_quote_id: string;
  order_id: string;
  order_seller_group_id: string;
  sales_order_id: string;
  seller_profile_id: string;
  buyer_profile_id: string;
  shipping_address_snapshot: Address;
  packages: Array<{
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    description?: string;
  }>;
}

/** Body de PATCH /api/v1/shipments/{id}/status (admin/logistics override). */
export interface PatchShipmentStatusBody {
  status: ShipmentStatus;
  note?: string;
}

/**
 * Filtros que acepta GET /api/v1/shipments (listado admin). Se mapean 1:1 a
 * query params en el service (URLSearchParams). Cuando un filter es array,
 * se serializa con bracket notation: `status[]=in_transit&status[]=delivered`.
 */
export interface ShipmentsAdminFilters {
  tracking_number?: string;
  seller_profile_id?: string;
  order_id?: string;
  status?: ShipmentStatus[];
  created_at_from?: string;
  created_at_to?: string;
}
