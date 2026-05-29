"use client";
import { useQuery } from "@tanstack/react-query";
import { listShipmentGroupsAdmin } from "@/services/api/shipments";
import type { ShipmentsAdminFilters } from "@/types/shipments";

/**
 * ADR-005: hook para la tabla admin de envíos agrupada por order_id.
 * 1 fila = 1 pedido (con N shipments internos).
 */
export function useShipmentGroupsAdmin(
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
      "groups",
      filters,
      page,
      perPage,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      listShipmentGroupsAdmin(filters, page, perPage, sortBy, sortDir),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
