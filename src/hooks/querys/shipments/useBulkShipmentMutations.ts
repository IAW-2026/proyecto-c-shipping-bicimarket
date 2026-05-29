"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { addTrackingEvent } from "@/services/api/shipments";
import type { CreateTrackingEventBody } from "@/types/tracking-events";

/**
 * Mutations sobre un conjunto de shipments — pensado para órdenes
 * multi-vendedor donde el operador avanza N shipments del mismo order_id
 * en paralelo (ADR-005). Después del último picked_up por origen, todos
 * los shipments deberían moverse juntos a `in_transit`, `out_for_delivery`,
 * etc.
 *
 * `bulkAdvanceStatus` dispara N POST /tracking-events en paralelo y rinde
 * un único toast por el conjunto. No es atómico — si un POST falla, los
 * demás siguen su curso y el usuario ve el error en consola. Para el
 * sprint 1 alcanza con esta semántica; en sprint 2 se puede mover al
 * backend con un endpoint `POST /orders/{orderId}/bulk-tracking-event`.
 */
export interface BulkAdvanceVariables {
  shipmentIds: string[];
  body: CreateTrackingEventBody;
}

export function useBulkShipmentMutations() {
  return {
    bulkAdvanceStatus: useApiMutation({
      mutationFn: async ({ shipmentIds, body }: BulkAdvanceVariables) => {
        const results = await Promise.allSettled(
          shipmentIds.map((id) => addTrackingEvent(id, body)),
        );
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          // Tiramos para que useApiMutation muestre el toast de error.
          // El primer rejection determina el mensaje.
          const first = failures[0] as PromiseRejectedResult;
          throw first.reason;
        }
        return results
          .filter(
            (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof addTrackingEvent>>> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);
      },
      invalidateKeys: [["shipments"], ["my-assignments"]],
      successMessage: "Estado actualizado en todos los envíos",
    }),
  };
}
