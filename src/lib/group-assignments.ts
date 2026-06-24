// Agrupador en el cliente de AssignmentDTO[] por order_id. ADR-005:
// los pedidos multi-vendedor del marketplace generan N shipments con el
// mismo order_id, y la UI del operador los renderiza como una sola card
// con N filas de pickup. Cuando un order_id tiene un solo shipment, el
// grupo se renderiza con la card mobile clásica.
//
// Estado derivado del grupo (allPickedUp, pendingPickupCount) se calcula
// en memoria — no necesita endpoint dedicado.

import type { AssignmentDTO } from "@/types/assignments";
import type { Address } from "@/types/common";

export interface AssignmentGroup {
  orderId: string;
  shippingAddress: Address;
  assignments: AssignmentDTO[];
  isMultiOrigin: boolean;
  allPickedUp: boolean;
  pendingPickupCount: number;
}

const PICKED_UP_OR_BEYOND = new Set([
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

export function groupAssignmentsByOrder(
  items: AssignmentDTO[],
): AssignmentGroup[] {
  const byOrder = new Map<string, AssignmentDTO[]>();
  for (const a of items) {
    const list = byOrder.get(a.order_id) ?? [];
    list.push(a);
    byOrder.set(a.order_id, list);
  }

  const groups: AssignmentGroup[] = [];
  for (const [orderId, assignments] of byOrder.entries()) {
    const allPickedUp = assignments.every((a) =>
      PICKED_UP_OR_BEYOND.has(a.status),
    );
    const pendingPickupCount = assignments.filter(
      (a) => a.status === "ready_for_pickup",
    ).length;
    groups.push({
      orderId,
      shippingAddress: assignments[0].shipping_address,
      assignments,
      isMultiOrigin: assignments.length > 1,
      allPickedUp,
      pendingPickupCount,
    });
  }

  return groups;
}
