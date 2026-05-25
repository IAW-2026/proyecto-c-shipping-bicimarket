"use client";
import { useUrlParams } from "@/hooks/useUrlParams";
import { useShipmentsAdmin } from "@/hooks/querys/shipments/useShipmentsAdmin";
import { DataTable } from "@/components/data-table/DataTable";
import { columnsShipments } from "./columns";
import { filterConfigsShipments } from "./filtersConfig";
import type {
  ShipmentStatus,
  ShipmentsAdminFilters,
} from "@/types/shipments";

export function ShipmentsTable() {
  const { getParam, getArrayParam } = useUrlParams();

  const filters: ShipmentsAdminFilters = {
    tracking_number: getParam("tracking_number") ?? undefined,
    seller_profile_id: getParam("seller_profile_id") ?? undefined,
    status: (getArrayParam("status") as ShipmentStatus[]) ?? undefined,
    created_at_from: getParam("created_at_from") ?? undefined,
    created_at_to: getParam("created_at_to") ?? undefined,
  };

  const page = Number(getParam("page") ?? 1);
  const perPage = Number(getParam("per_page") ?? 20);
  const sortBy = getParam("sort_by") ?? "created_at";
  const sortDir = (getParam("sort_dir") ?? "desc") as "asc" | "desc";

  const { data, isLoading, isError } = useShipmentsAdmin(
    filters,
    page,
    perPage,
    sortBy,
    sortDir,
  );

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Error cargando shipments. Refrescá la página.
      </p>
    );
  }

  return (
    <DataTable
      data={data?.data ?? []}
      columns={columnsShipments}
      filters={filterConfigsShipments}
      pagination={
        data?.pagination ?? {
          total: 0,
          page,
          limit: perPage,
          has_more: false,
        }
      }
      isLoading={isLoading}
      emptyMessage="No hay envíos que coincidan con los filtros"
    />
  );
}
