// Helper compartido para calcular el "rollup status" de un pedido
// multi-vendedor (ADR-005). Vive en src/lib sin imports de Prisma para
// poder usarse desde el cliente.

import type { ShipmentStatus } from "@/types/shipments";

const STATUS_ORDER: Record<ShipmentStatus, number> = {
  created: 0,
  ready_for_pickup: 1,
  picked_up: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
  failed_delivery: 6, // tratado aparte por prioridad
  returned: 7,
};

/**
 * Estado consolidado del pedido a partir de los estados de sus N shipments:
 *  1. Todos `delivered`        → `delivered`
 *  2. Alguno `failed_delivery` → `failed_delivery` (prioridad de atención)
 *  3. Alguno `returned`        → `returned`
 *  4. Si no, el estado MENOS avanzado (el bottleneck del pedido).
 */
export function rollupShipmentStatus(
  statuses: ShipmentStatus[],
): ShipmentStatus {
  if (statuses.length === 0) return "created";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.some((s) => s === "failed_delivery")) return "failed_delivery";
  if (statuses.some((s) => s === "returned")) return "returned";
  return statuses.reduce(
    (least, s) => (STATUS_ORDER[s] < STATUS_ORDER[least] ? s : least),
    statuses[0],
  );
}

/**
 * Estado DERIVADO de UI (no vive en la DB): el pedido está en "entrega parcial"
 * cuando al menos un envío ya se entregó Y al menos otro falló o se devolvió.
 * En ese caso el rollup de la DB queda en `failed_delivery`/`returned` (por
 * prioridad de atención), pero a nivel pedido conviene comunicar que parte SÍ
 * llegó. La decisión fue resolverlo solo en la UI, sin tocar el enum ni la
 * máquina de estados. Ver `OrderStatusBadge` y `OrderShipmentFlow`.
 */
export function isPartialDelivery(statuses: ShipmentStatus[]): boolean {
  const delivered = statuses.filter((s) => s === "delivered").length;
  const problem = statuses.filter(
    (s) => s === "failed_delivery" || s === "returned",
  ).length;
  return delivered > 0 && problem > 0;
}
