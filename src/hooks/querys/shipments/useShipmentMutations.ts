"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  addTrackingEvent,
  deliverShipment,
  patchShipmentStatus,
} from "@/services/api/shipments";
import type {
  CreateTrackingEventBody,
  DeliverShipmentBody,
} from "@/types/tracking-events";
import type { PatchShipmentStatusBody } from "@/types/shipments";

/**
 * Hook agrupado de mutations del dominio "shipments". El componente
 * desestructura solo las que necesita:
 *
 *   const { deliver, addTrackingEvent } = useShipmentMutations(shipmentId);
 *
 * Nota: addPackage no está acá porque POST /packages es S2S puro (lo llama
 * Seller App). Si en sprint 2 sumamos UI admin para agregar paquetes manual,
 * va a ser un endpoint distinto con auth JWT.
 */
export function useShipmentMutations(shipmentId: string) {
  const shipmentKey = ["shipments", shipmentId];
  const trackingKey = ["shipments", shipmentId, "tracking"];
  const myAssignmentsKey = ["my-assignments"];
  const adminListKey = ["shipments", "admin"];

  return {
    addTrackingEvent: useApiMutation({
      mutationFn: (data: CreateTrackingEventBody) =>
        addTrackingEvent(shipmentId, data),
      invalidateKeys: [shipmentKey, trackingKey, myAssignmentsKey, adminListKey],
      successMessage: "Evento de tracking registrado",
    }),

    deliver: useApiMutation({
      mutationFn: (data: DeliverShipmentBody) =>
        deliverShipment(shipmentId, data),
      invalidateKeys: [shipmentKey, trackingKey, myAssignmentsKey, adminListKey],
      successMessage: "Envío marcado como entregado",
    }),

    patchStatus: useApiMutation({
      mutationFn: (data: PatchShipmentStatusBody) =>
        patchShipmentStatus(shipmentId, data),
      invalidateKeys: [shipmentKey, myAssignmentsKey, adminListKey],
      successMessage: "Estado actualizado",
    }),
  };
}
