"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { retryShipment } from "@/services/api/shipments";

/**
 * Mutation para crear un nuevo shipment como retry de uno fallido.
 * El backend marca el original como returned y crea uno nuevo en
 * ready_for_pickup, disponible para que cualquier operador lo tome.
 */
export function useRetryShipment() {
  return useApiMutation({
    mutationFn: (shipmentId: string) => retryShipment(shipmentId),
    invalidateKeys: [
      ["shipments"],
      ["my-assignments"],
      ["shipments", "admin"],
      ["shipments", "kpis"],
    ],
    successMessage: "Envío reintentado — el nuevo ya está disponible",
  });
}
