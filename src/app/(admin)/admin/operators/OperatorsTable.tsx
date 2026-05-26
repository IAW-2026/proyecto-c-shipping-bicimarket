"use client";
import { Users, UserX } from "lucide-react";
import { useUrlParams } from "@/hooks/useUrlParams";
import { useLogisticsOperatorsAdmin } from "@/hooks/querys/logistics-operators/useLogisticsOperatorsAdmin";
import { useOperatorsKpis } from "@/hooks/querys/logistics-operators/useOperatorsKpis";
import { DataTable } from "@/components/data-table/DataTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { columnsOperators } from "./columns";
import { filterConfigsOperators } from "./filtersConfig";
import type {
  LogisticsOperatorsAdminFilters,
} from "@/types/operator-performance";
import type {
  OperatorStatus,
  VehicleType,
} from "@/types/logistics-operators";

export function OperatorsTable() {
  const { getParam, getArrayParam, setMultipleParams } = useUrlParams();

  const filters: LogisticsOperatorsAdminFilters = {
    q: getParam("q") ?? undefined,
    status: (getArrayParam("status") as OperatorStatus[]) ?? undefined,
    vehicle_type:
      (getArrayParam("vehicle_type") as VehicleType[]) ?? undefined,
  };

  const page = Number(getParam("page") ?? 1);
  const perPage = Number(getParam("per_page") ?? 20);
  const sortBy = getParam("sort_by") ?? "created_at";
  const sortDir = (getParam("sort_dir") ?? "desc") as "asc" | "desc";

  const hasActiveFilters =
    !!filters.q ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.vehicle_type?.length ?? 0) > 0;

  const { data, isLoading, isError, refetch } = useLogisticsOperatorsAdmin(
    filters,
    page,
    perPage,
    sortBy,
    sortDir,
  );

  const { data: kpis, isLoading: kpisLoading } = useOperatorsKpis();

  function clearFilters() {
    setMultipleParams({
      q: null,
      status: null,
      vehicle_type: null,
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
            <KpiCard label="Activos" value={kpis.active} />
            <KpiCard label="Suspendidos" value={kpis.suspended} />
            <KpiCard
              label="Assignments activos"
              value={kpis.active_assignments}
              delta={kpis.delta_active_assignments}
              deltaSuffix="hoy"
            />
            <KpiCard
              label="Avg entregas/30D"
              value={kpis.avg_deliveries_30d}
            />
          </>
        ) : null}
      </div>

      {isError && (
        <ErrorBanner
          title="Error cargando operadores"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && rows.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={UserX}
            variant="muted"
            title="No hay operadores que coincidan"
            subtitle="Probá quitar algún filtro o buscar por otro campo."
            cta={{ label: "Limpiar filtros", onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            icon={Users}
            variant="primary"
            title="Aún no hay operadores registrados"
            subtitle="Antes de crear un operador acá, invitalo desde Clerk Dashboard y obtené su user_… ID."
            cta={{ label: "+ Nuevo operador", href: "/admin/operators/new" }}
          />
        )
      ) : (
        <DataTable
          data={rows}
          columns={columnsOperators}
          filters={filterConfigsOperators}
          pagination={
            data?.pagination ?? {
              total: 0,
              page,
              limit: perPage,
              has_more: false,
            }
          }
          isLoading={isLoading}
          emptyMessage="Sin operadores"
        />
      )}
    </div>
  );
}
