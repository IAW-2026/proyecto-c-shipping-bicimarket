import type { ServiceLevel } from "./shipments";

/**
 * Tarifaría — fila individual. Lo que devuelve GET /api/v1/shipping-rates.
 *
 * La tarifa se aplica cuando la distancia origen↔destino cae en
 * [distance_km_min, distance_km_max] y el peso total cae en
 * [weight_grams_min, weight_grams_max] y el service_level matchea.
 *
 * La distancia entre dos CPs se calcula con Haversine sobre el dataset
 * `src/lib/geo/ar-postal-codes.ts`. Si un CP no está en el dataset, el
 * motor tira 422 POSTAL_CODE_UNKNOWN (no usamos fallback default).
 */
export interface ShippingRateDTO {
  id: string;
  carrier: string;
  service_level: ServiceLevel;
  distance_km_min: number;
  distance_km_max: number;
  weight_grams_min: number;
  weight_grams_max: number;
  cost_cents: number;
  estimated_days_min: number;
  estimated_days_max: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShippingRateBody {
  carrier: string;
  service_level: ServiceLevel;
  distance_km_min: number;
  distance_km_max: number;
  weight_grams_min: number;
  weight_grams_max: number;
  cost_cents: number;
  estimated_days_min: number;
  estimated_days_max: number;
  active?: boolean;
}

export type UpdateShippingRateBody = Partial<CreateShippingRateBody>;
