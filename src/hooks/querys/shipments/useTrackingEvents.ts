"use client";
import { useQuery } from "@tanstack/react-query";
import { listTrackingEvents } from "@/services/api/shipments";

export function useTrackingEvents(
  shipmentId?: string,
  page = 1,
  limit = 50,
) {
  return useQuery({
    queryKey: ["shipments", shipmentId, "tracking", page, limit],
    queryFn: () => {
      if (!shipmentId) throw new Error("shipmentId requerido");
      return listTrackingEvents(shipmentId, page, limit);
    },
    enabled: !!shipmentId,
    staleTime: 30 * 1000,
  });
}
