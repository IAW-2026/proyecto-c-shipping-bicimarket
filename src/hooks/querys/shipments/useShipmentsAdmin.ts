"use client";
import { useQuery } from "@tanstack/react-query";
import { listShipmentsAdmin } from "@/services/api/shipments";
import type { ShipmentsAdminFilters } from "@/types/shipments";

export function useShipmentsAdmin(
  filters: ShipmentsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  return useQuery({
    queryKey: [
      "shipments",
      "admin",
      filters,
      page,
      perPage,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      listShipmentsAdmin(filters, page, perPage, sortBy, sortDir),
    staleTime: 30 * 1000,
    // Mantiene la data anterior visible mientras refetchea — evita el flash
    // de skeleton al cambiar página/filtros (smooth UX).
    placeholderData: (prev) => prev,
  });
}
