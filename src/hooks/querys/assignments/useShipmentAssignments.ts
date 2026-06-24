"use client";
import { useQuery } from "@tanstack/react-query";
import { listShipmentAssignments } from "@/services/api/assignments";

/**
 * Devuelve todos los assignments del shipment (histórico) con el operador
 * joineado. Filtrar por status activo en el caller cuando interese solo
 * "quién lo tiene ahora".
 */
export function useShipmentAssignments(shipmentId?: string) {
  return useQuery({
    queryKey: ["shipments", shipmentId, "assignments"],
    queryFn: () => {
      if (!shipmentId) throw new Error("shipmentId requerido");
      return listShipmentAssignments(shipmentId);
    },
    enabled: !!shipmentId,
    staleTime: 30 * 1000,
  });
}
