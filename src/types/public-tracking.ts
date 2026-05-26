import type { ShipmentStatus, ServiceLevel } from "./shipments";
import type { TrackingEventType } from "./tracking-events";

/**
 * Shape público del tracking de un envío. Lo consume cualquier usuario
 * (anónimo) via /track/[code]. Omite datos sensibles:
 *   - clerk_user_id del operador
 *   - calle exacta de pickup/shipping (solo city/province/postal_code)
 *   - costo del envío
 *   - IDs internos (order_id, sales_order_id, buyer_profile_id...)
 *
 * Sí incluye la foto de entrega si el envío está delivered — la URL ya es
 * pública en el bucket de Supabase.
 */
export interface PublicTrackingDTO {
  tracking_number: string;
  shipment_id: string;
  status: ShipmentStatus;
  carrier: string;
  service_level: ServiceLevel;

  // Origen y destino — solo geo de alto nivel
  origin: {
    city: string;
    province: string;
    postal_code: string;
  };
  destination: {
    city: string;
    province: string;
    postal_code: string;
  };

  // Resumen
  weight_grams_total: number;
  packages_count: number;

  // Timeline
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;

  events: Array<{
    event_type: TrackingEventType;
    location: string | null;
    note: string | null;
    occurred_at: string;
  }>;

  // Prueba de entrega (solo si delivered)
  proof?: {
    photo_url: string;
    note: string | null;
    delivered_at: string;
  };
}
