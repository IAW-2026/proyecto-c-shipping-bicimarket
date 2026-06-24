"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getDeliveryProof } from "@/services/api/delivery-proofs";

/**
 * Hook para traer la prueba de entrega de un shipment. Lo recomendable es
 * pasar `enabled` solo cuando el shipment está en status="delivered" — si
 * no hay proof, el endpoint tira 404 y `useQuery` lo marca como error.
 */
export function useDeliveryProof(shipmentId?: string, enabled = true) {
  return useQuery({
    queryKey: ["shipments", shipmentId, "delivery-proof"],
    queryFn: () => {
      if (!shipmentId) throw new Error("shipmentId requerido");
      return getDeliveryProof(shipmentId);
    },
    enabled: !!shipmentId && enabled,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 403) return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });
}
