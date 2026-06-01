"use client";
import { useQuery } from "@tanstack/react-query";
import { getAdminParties } from "@/services/api/parties";

/**
 * Lista de vendedores/compradores que ya existen en la app, para los selects
 * del form de nuevo pedido. Cambian poco → staleTime alto.
 */
export function useAdminParties() {
  return useQuery({
    queryKey: ["admin", "parties"],
    queryFn: getAdminParties,
    staleTime: 5 * 60 * 1000,
  });
}
