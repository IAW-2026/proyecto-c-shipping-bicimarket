import type { Address } from "./common";
import type { ServiceLevel } from "./shipments";

/**
 * Body para POST /api/v1/admin/shipments — endpoint dev para crear envíos
 * manualmente desde la UI. NO existe en la API contractual (los shipments
 * los crea Seller via S2S, ver docs/03 §SH2).
 */
export interface CreateAdminShipmentBody {
  seller_profile_id: string;
  buyer_profile_id: string;
  buyer_name?: string;
  service_level: ServiceLevel;
  pickup_address: Address;
  shipping_address: Address;
  packages: Array<{
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    description?: string;
  }>;
}
