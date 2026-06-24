"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getShipmentGroup } from "@/services/api/shipments";

/**
 * ADR-006: detalle del pedido completo (grupo) para el operador / admin.
 * `code` es el tracking global BMK-… o el grp_…. La queryKey arranca con
 * "shipments" para que las mutations (retiro/entrega) que invalidan
 * ["shipments"] (exact:false) refresquen esta vista automáticamente.
 */
export function useShipmentGroup(code?: string) {
  return useQuery({
    queryKey: ["shipments", "group", code],
    queryFn: () => {
      if (!code) throw new Error("code requerido");
      return getShipmentGroup(code);
    },
    enabled: !!code,
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
