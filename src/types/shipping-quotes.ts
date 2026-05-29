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

/**
 * Body de POST /api/v1/shipping-quotes (S2S Buyer, docs/03 §SH1).
 * Desde ADR-005 acepta siempre pickups[] (N>=1). N=1 = single-origen sin
 * descuento; N>=2 aplica descuento multi-origen.
 */
export interface CreateQuoteBody {
  pickups: Array<{
    seller_profile_id: string;
    packages: Array<{
      weight_grams: number;
      length_cm: number;
      width_cm: number;
      height_cm: number;
    }>;
  }>;
  to: {
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  service_level: ServiceLevel;
}

/**
 * Response unificado de POST /api/v1/shipping-quotes. Tanto single-origen
 * como multi-vendedor devuelven este shape. Consumers iteran `quotes[]`
 * sin distinguir el caso; `discount_pct=0` y `total_gross_cents ===
 * total_net_cents` cuando origins_count===1.
 */
export interface QuoteResponseDTO {
  origins_count: number;
  discount_pct: number;
  total_gross_cents: number;
  total_net_cents: number;
  currency: "ARS";
  quotes: ShippingQuoteDTO[];
}
