import type { Address } from "./common";
import type { ServiceLevel, ShipmentDTO } from "./shipments";

export interface PackageInput {
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  description?: string;
}

export interface PickupInput {
  seller_profile_id: string;
  pickup_address: Address;
  packages: PackageInput[];
}

/**
 * Body para POST /api/v1/admin/shipments — endpoint dev para crear pedidos
 * manualmente desde la UI. NO existe en la API contractual (los shipments
 * los crea Seller via S2S, ver docs/03 §SH2).
 *
 * Multi-pickup: un pedido puede tener N orígenes (uno por vendedor) que
 * van todos al mismo destino. El servicio (service_level) es único por
 * pedido — la ruta también lo es.
 */
export interface CreateAdminShipmentBody {
  buyer_profile_id: string;
  buyer_name?: string;
  service_level: ServiceLevel;
  shipping_address: Address;
  pickups: PickupInput[];
}

/**
 * Respuesta del POST: el `order_id` agrupa los N shipments. `ordered_sequence`
 * son los índices de `body.pickups` en el orden óptimo de visita. El costo
 * total se reparte proporcional al peso entre los N shipments individuales.
 */
export interface CreateAdminShipmentResponse {
  order_id: string;
  total_distance_km: number;
  ordered_sequence: number[];
  total_cost_cents: number;
  shipments: ShipmentDTO[];
}
