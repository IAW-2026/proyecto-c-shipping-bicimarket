import { ShipmentStatus, TrackingEventType } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-error";

/**
 * Tabla normativa de transiciones permitidas para shipment.status.
 * Fuente de verdad: docs/06-estados-y-diagramas.md §3.
 *
 * Si querés agregar/quitar una transición, actualizá también el diagrama y
 * la tabla del doc en el mismo PR.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.created]: [ShipmentStatus.ready_for_pickup],
  [ShipmentStatus.ready_for_pickup]: [ShipmentStatus.picked_up],
  [ShipmentStatus.picked_up]: [ShipmentStatus.in_transit],
  [ShipmentStatus.in_transit]: [
    ShipmentStatus.out_for_delivery,
    ShipmentStatus.delivered,
    ShipmentStatus.failed_delivery,
  ],
  [ShipmentStatus.out_for_delivery]: [
    ShipmentStatus.delivered,
    ShipmentStatus.failed_delivery,
  ],
  [ShipmentStatus.failed_delivery]: [
    ShipmentStatus.in_transit,
    ShipmentStatus.returned,
  ],
  [ShipmentStatus.delivered]: [], // terminal
  [ShipmentStatus.returned]: [], // terminal
};

/**
 * Validá una transición. Si es inválida, tira ApiError 409 con detalles
 * útiles para el cliente: { from, to, allowed }.
 */
export function assertTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
  table: Record<ShipmentStatus, ShipmentStatus[]> = SHIPMENT_TRANSITIONS,
): void {
  const allowed = table[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ApiError(
      "INVALID_TRANSITION",
      409,
      `No se puede pasar de "${from}" a "${to}"`,
      { from, to, allowed },
    );
  }
}

/**
 * Mapeo evento → status objetivo. Devuelve null si el evento NO cambia el
 * status del shipment (caso de eventos puramente informativos).
 * Por ahora, todos los TrackingEventType tienen un ShipmentStatus equivalente.
 */
export function eventTypeToStatus(
  eventType: TrackingEventType,
): ShipmentStatus | null {
  const map: Record<TrackingEventType, ShipmentStatus | null> = {
    [TrackingEventType.created]: ShipmentStatus.created,
    [TrackingEventType.ready_for_pickup]: ShipmentStatus.ready_for_pickup,
    [TrackingEventType.picked_up]: ShipmentStatus.picked_up,
    [TrackingEventType.in_transit]: ShipmentStatus.in_transit,
    [TrackingEventType.out_for_delivery]: ShipmentStatus.out_for_delivery,
    [TrackingEventType.delivered]: ShipmentStatus.delivered,
    [TrackingEventType.failed_delivery]: ShipmentStatus.failed_delivery,
    [TrackingEventType.returned]: ShipmentStatus.returned,
  };
  return map[eventType];
}
