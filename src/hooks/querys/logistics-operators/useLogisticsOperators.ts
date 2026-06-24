"use client";
import { useQuery } from "@tanstack/react-query";
import { listOperators } from "@/services/api/logistics-operators";
import type { OperatorStatus } from "@/types/logistics-operators";

/**
 * Listado simple de operadores (sin counts). Lo usa el modal de asignar
 * operador y el dropdown de filtros. Para la tabla admin con stats, usar
 * `useLogisticsOperatorsAdmin` que pega al mismo endpoint con `?detailed=1`.
 */
export function useLogisticsOperators(
  page = 1,
  perPage = 20,
  filters?: { status?: OperatorStatus[] },
) {
  return useQuery({
    queryKey: ["logistics-operators", page, perPage, filters],
    queryFn: () => listOperators(page, perPage, filters),
    staleTime: 5 * 60 * 1000,
  });
}
