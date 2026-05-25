import type { ServiceLevel } from "./shipments";

export type { ServiceLevel };

export interface ShippingQuoteDTO {
  id: string;
  seller_profile_id: string;
  service_level: ServiceLevel;
  carrier: string;
  cost_cents: number;
  currency: "ARS";
  estimated_days_min: number;
  estimated_days_max: number;
  weight_grams_total: number;
  packages_count: number;
  expires_at: string;
}

/** Body de POST /api/v1/shipping-quotes (S2S Buyer, docs/03 §SH1). */
export interface CreateQuoteBody {
  from: {
    seller_profile_id: string;
  };
  to: {
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  packages: Array<{
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  }>;
  service_level: ServiceLevel;
}
