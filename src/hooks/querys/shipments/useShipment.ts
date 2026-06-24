"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getShipment } from "@/services/api/shipments";

export function useShipment(shipmentId?: string) {
  return useQuery({
    queryKey: ["shipments", shipmentId],
    queryFn: () => {
      if (!shipmentId) throw new Error("shipmentId requerido");
      return getShipment(shipmentId);
    },
    enabled: !!shipmentId,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
      }
      return failureCount < 2;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
