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
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
