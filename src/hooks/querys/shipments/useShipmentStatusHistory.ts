"use client";
import { useQuery } from "@tanstack/react-query";
import { getShipmentStatusHistory } from "@/services/api/shipments";

export function useShipmentStatusHistory(shipmentId?: string) {
  return useQuery({
    queryKey: ["shipments", shipmentId, "status-history"],
    queryFn: () => {
      if (!shipmentId) throw new Error("shipmentId requerido");
      return getShipmentStatusHistory(shipmentId);
    },
    enabled: !!shipmentId,
    staleTime: 60 * 1000,
  });
}
