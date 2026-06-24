"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { retryShipment } from "@/services/api/shipments";

/** Reintenta el mismo shipment: failed_delivery -> in_transit. */
export function useRetryShipment() {
  return useApiMutation({
    mutationFn: (shipmentId: string) => retryShipment(shipmentId),
    invalidateKeys: [
      ["shipments"],
      ["my-assignments"],
      ["shipments", "admin"],
      ["shipments", "kpis"],
    ],
    successMessage: "Envio reintentado y nuevamente en transito",
  });
}
