"use client";
import { PackageOpen, PackageSearch, SearchX } from "lucide-react";
import { useUrlParams } from "@/hooks/useUrlParams";
import { useShipmentsAdmin } from "@/hooks/querys/shipments/useShipmentsAdmin";
import { useShipmentsKpis } from "@/hooks/querys/shipments/useShipmentsKpis";
import { DataTable } from "@/components/data-table/DataTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { columnsShipments } from "./columns";
import { filterConfigsShipments } from "./filtersConfig";
import type {
  ShipmentStatus,
  ShipmentsAdminFilters,
} from "@/types/shipments";

export function ShipmentsTable() {
  const { getParam, getArrayParam, setMultipleParams } = useUrlParams();

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

  const hasActiveFilters =
    !!filters.tracking_number ||
    !!filters.seller_profile_id ||
    (filters.status?.length ?? 0) > 0 ||
    !!filters.created_at_from ||
    !!filters.created_at_to;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useShipmentsAdmin(filters, page, perPage, sortBy, sortDir);

  const { data: kpis, isLoading: kpisLoading } = useShipmentsKpis();

  function clearFilters() {
    setMultipleParams({
      tracking_number: null,
      seller_profile_id: null,
      status: null,
      created_at_from: null,
      created_at_to: null,
      page: "1",
    });
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : kpis ? (
          <>
            <KpiCard
              label="Activos"
              value={kpis.active}
              sparkline={kpis.sparkline_active}
            />
            <KpiCard
              label="Entregados hoy"
              value={kpis.delivered_today}
              delta={kpis.delta_delivered_today}
              deltaSuffix="vs ayer"
              sparkline={kpis.sparkline_delivered}
            />
            <KpiCard
              label="Fallidos"
              value={kpis.failed_30d}
              delta={kpis.delta_failed_30d}
              deltaSuffix="30D"
            />
            <KpiCard
              label="Devueltos"
              value={kpis.returned_30d}
              delta={kpis.delta_returned_30d}
              deltaSuffix="30D"
            />
          </>
        ) : null}
      </div>

      {/* Error banner — sigue mostrando tabla vacía debajo */}
      {isError && (
        <ErrorBanner
          title="Error cargando envíos"
          subtitle="Reintentá. Si persiste, avisá a ops@bicimarket.com"
          onRetry={() => refetch()}
        />
      )}

      {/* Body: tabla, empty o error */}
      {!isLoading && !isError && rows.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            variant="muted"
            title="No hay envíos que coincidan"
            subtitle="Probá quitar algún filtro o ampliar el rango de fechas."
            cta={{ label: "Limpiar filtros", onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            icon={PackageOpen}
            variant="primary"
            title="Aún no hay envíos en el sistema"
            subtitle="Los envíos aparecen automáticamente cuando un comprador confirma el pago en Buyer App."
          />
        )
      ) : (
        <DataTable
          data={rows}
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
          emptyMessage={
            hasActiveFilters
              ? "Sin resultados con los filtros aplicados"
              : "Sin envíos"
          }
        />
      )}

      {/* Hint cuando hay data pero ningún filtro y poca data */}
      {!isLoading && rows.length > 0 && rows.length < 5 && (
        <p className="text-center text-xs text-muted-foreground">
          <PackageSearch className="-mt-0.5 mr-1 inline size-3.5" />
          Sólo {rows.length} envíos visibles · revisá filtros activos.
        </p>
      )}
    </div>
  );
}
