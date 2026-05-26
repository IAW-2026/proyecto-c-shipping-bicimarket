"use client";
import { useQuery } from "@tanstack/react-query";
import { listOperatorsAdmin } from "@/services/api/logistics-operators";
import type { LogisticsOperatorsAdminFilters } from "@/types/operator-performance";

export function useLogisticsOperatorsAdmin(
  filters: LogisticsOperatorsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  return useQuery({
    queryKey: [
      "logistics-operators",
      "admin",
      filters,
      page,
      perPage,
      sortBy,
      sortDir,
    ],
    queryFn: () => listOperatorsAdmin(filters, page, perPage, sortBy, sortDir),
    // Auto-refresh: la data queda "fresca" 30s y después se refetchea
    // automáticamente. Útil para que el admin vea cambios en tiempo real
    // sin tener que recargar la página.
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}
