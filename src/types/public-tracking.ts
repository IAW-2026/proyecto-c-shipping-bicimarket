import type {
  ShipmentStatus,
  ServiceLevel,
  OrderPickupSummary,
} from "./shipments";
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
  /**
   * ADR-006: qué vista es. `order` = el comprador buscó por el código global
   * del pedido (`BMK-…`) → ve el pedido completo (todos los vendedores).
   * `shipment` = se buscó por el código de un envío individual (`TRK-AR-…`) →
   * se ve SOLO ese envío (un vendedor no ve los de otros vendedores).
   */
  view: "order" | "shipment";
  /**
   * El código que el usuario buscó y que se muestra como título. En vista
   * `order` es el `BMK-…`; en vista `shipment` es el `TRK-AR-…`.
   */
  tracking_number: string;
  /**
   * ADR-006: tracking GLOBAL del pedido, formato `BMK-…`. Vive en el
   * ShipmentGroup (1 por pedido) y es el ÚNICO que ve el comprador. Si
   * coincide con `tracking_number`, el usuario buscó por el global; si
   * difiere, buscó por un envío individual y le informamos el del pedido.
   */
  order_tracking_number: string;
  /**
   * Cantidad de pickups del pedido. Para single-origen es 1.
   * Conveniente para hints como "1 de N envíos".
   */
  order_pickups_count: number;
  /**
   * Resumen de TODOS los pickups del pedido. Permite renderizar el flow
   * multi-vendedor en la pantalla pública sin round-trips extra.
   */
  order_pickups: OrderPickupSummary[];
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
    photo_url: string | null;
    note: string | null;
    delivered_at: string;
  };
}
