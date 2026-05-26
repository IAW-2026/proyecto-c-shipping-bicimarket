import type { ServiceLevel } from "./shipments";

/**
 * Respuesta de GET /api/v1/quote-preview — cálculo on-the-fly del costo
 * de un envío sin persistir nada. Lo usan las otras apps (Buyer típicamente)
 * para previews de precio mientras el usuario edita el carrito.
 *
 * Si la cotización va a usarse para crear un shipment, hay que hacer
 * POST /api/v1/shipping-quotes (que sí persiste y devuelve un quote_id).
 */
export interface QuotePreviewDTO {
  cost_cents: number;
  currency: "ARS";
  carrier: string;
  service_level: ServiceLevel;
  distance_km: number;
  weight_grams_total: number;
  estimated_days_min: number;
  estimated_days_max: number;
}
