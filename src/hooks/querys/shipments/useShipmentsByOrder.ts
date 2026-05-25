"use client";
import { useQuery } from "@tanstack/react-query";
import { listShipmentsByOrder } from "@/services/api/shipments";

/**
 * Lista shipments por order_id. Pensado para que Buyer App lo consuma vía
 * proxy server-side (con X-Service-Token). En esta app de Shipping casi no
 * se usa desde el frontend — queda definido para completitud y para los
 * casos admin que quieran ver shipments agrupados por orden.
 */
export function useShipmentsByOrder(orderId?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["shipments", "by-order", orderId, page, limit],
    queryFn: () => {
      if (!orderId) throw new Error("orderId requerido");
      return listShipmentsByOrder(orderId, page, limit);
    },
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}
