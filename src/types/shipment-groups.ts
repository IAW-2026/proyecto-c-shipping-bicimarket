import type { Address } from "./common";
import type { ShipmentDTO, ShipmentStatus, ServiceLevel } from "./shipments";

/**
 * Estado "rolled-up" de un grupo de shipments (ADR-005).
 *
 * Reglas: si todos los shipments del grupo están en `delivered`, el grupo
 * está delivered. Si alguno está `failed_delivery` o `returned`, el grupo
 * refleja ese estado de "atención". Si no, se toma el estado MENOS avanzado
 * (el shipment que va más atrás), porque es el bottleneck del pedido.
 */
export type ShipmentGroupRollupStatus = ShipmentStatus;

export interface ShipmentGroupAggregate {
  /** Tracking del pedido entero (compartido por todos sus shipments). ADR-005. */
  order_tracking_number: string;
  origins_count: number;
  unique_sellers: string[]; // slp_…
  total_weight_grams: number;
  total_cost_cents: number;
  currency: "ARS";
  /** Breakdown contando shipments por estado actual. */
  status_breakdown: Partial<Record<ShipmentStatus, number>>;
  /** Estado rolled-up para la pill de la tabla. */
  rollup_status: ShipmentGroupRollupStatus;
  /** Service level (mismo para todos los shipments del grupo). */
  service_level: ServiceLevel;
  /** Dirección de entrega del comprador (la misma para todo el grupo). */
  shipping_address: Address;
  /** Buyer del pedido (el mismo para todo el grupo). */
  buyer_profile_id: string;
  /** Fecha del shipment más temprano del grupo (lo que ordena la tabla). */
  earliest_created_at: string;
}

/**
 * Devuelto por GET /api/v1/admin/shipment-groups. Cada item es un pedido
 * (order_id) con sus N shipments (uno por vendedor en órdenes multi-vendedor).
 * Sprint 1 / ADR-005: la tabla admin se rearma en torno a esto, así
 * 1 fila = 1 pedido.
 */
export interface ShipmentGroupDTO {
  order_id: string;
  aggregate: ShipmentGroupAggregate;
  shipments: ShipmentDTO[];
}
