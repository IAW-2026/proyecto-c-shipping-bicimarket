"use client";
import { useMemo, useState } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ShipmentMobileCard } from "@/components/operator/ShipmentMobileCard";
import { TransitionButton } from "@/components/operator/TransitionButton";
import { OrderPickupCard } from "@/components/operator/OrderPickupCard";
import { OperatorStatusBanner } from "@/components/operator/OperatorStatusBanner";
import { useMyAssignments } from "@/hooks/querys/assignments/useMyAssignments";
import { groupAssignmentsByOrder } from "@/lib/group-assignments";
import { cn } from "@/lib/utils";
import type { AssignmentDTO } from "@/types/assignments";
import type { ShipmentStatus } from "@/types/shipments";
import type { OperatorStatus } from "@/types/logistics-operators";

type Tab = "all" | "to_pickup" | "in_progress" | "out_for_delivery";

const TAB_LABELS: Record<Tab, string> = {
  all: "Todos",
  to_pickup: "A retirar",
  in_progress: "En curso",
  out_for_delivery: "En reparto",
};

const TAB_STATUSES: Record<Tab, ShipmentStatus[] | null> = {
  all: null, // null = sin filtrar
  to_pickup: ["ready_for_pickup"],
  in_progress: ["picked_up", "in_transit"],
  out_for_delivery: ["out_for_delivery"],
};

export function MyAssignmentsClient({
  firstName,
  operatorStatus,
}: {
  firstName: string;
  operatorStatus: OperatorStatus;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const { data, isLoading, isError, refetch, isRefetching } =
    useMyAssignments();
  const actionsBlocked = operatorStatus !== "active";

  const all = data?.data ?? [];

  const counts = useMemo(() => {
    const map: Record<Tab, number> = {
      all: all.length,
      to_pickup: 0,
      in_progress: 0,
      out_for_delivery: 0,
    };
    for (const a of all) {
      if (a.status === "ready_for_pickup") map.to_pickup++;
      if (a.status === "picked_up" || a.status === "in_transit")
        map.in_progress++;
      if (a.status === "out_for_delivery") map.out_for_delivery++;
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    const allowed = TAB_STATUSES[tab];
    if (!allowed) return all;
    return all.filter((a) => allowed.includes(a.status));
  }, [all, tab]);

  // Agrupar por order_id (ADR-005). Pedidos multi-vendedor (siblings>1) se
  // renderizan con OrderPickupCard, single-origen se mantiene en
  // ShipmentMobileCard como antes.
  const groups = useMemo(() => groupAssignmentsByOrder(filtered), [filtered]);

  const totalActive = all.length;
  const greeting = greetingFor(new Date());

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Mis envíos</h1>
          <p className="text-xs text-muted-foreground">
            {greeting}, {firstName} ·{" "}
            {isLoading
              ? "cargando…"
              : totalActive === 1
                ? "1 activo"
                : totalActive === 0
                  ? "al día"
                  : `${totalActive} activos`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          aria-label="Refrescar"
        >
          <RefreshCw
            className={cn("size-4", isRefetching && "animate-spin")}
          />
        </Button>
      </header>

      {/* Banner si la cuenta del operador está suspended/inactive */}
      <OperatorStatusBanner status={operatorStatus} />

      {isError && (
        <ErrorBanner
          title="Error cargando tus envíos"
          subtitle="Reintentá. Si persiste, avisá a tu coordinador."
          onRetry={() => refetch()}
        />
      )}

      {/* Tabs / pills */}
      {!isLoading && all.length > 0 && (
        <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {TAB_LABELS[t]} · {counts[t]}
              </button>
            );
          })}
        </nav>
      )}

      {/* Body */}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          variant="primary"
          title="Al día, no tenés envíos asignados"
          subtitle="Cuando un coordinador te asigne envíos vas a verlos acá. Tirá para refrescar."
          cta={{ label: "Refrescar", onClick: () => refetch() }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          variant="muted"
          title="Sin envíos en este estado"
          subtitle="Probá con otro filtro arriba."
        />
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.orderId}>
              {g.isMultiOrigin ? (
                <OrderPickupCard group={g} disabled={actionsBlocked} />
              ) : (
                <AssignmentItem
                  assignment={g.assignments[0]}
                  disabled={actionsBlocked}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {all.length === 1 && (
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Tirá hacia abajo para refrescar
        </p>
      )}
    </div>
  );
}

function AssignmentItem({
  assignment,
  disabled,
}: {
  assignment: AssignmentDTO;
  disabled: boolean;
}) {
  return (
    <ShipmentMobileCard
      assignment={assignment}
      cta={
        <TransitionButton
          shipmentId={assignment.id}
          trackingNumber={assignment.tracking_number}
          weightGrams={assignment.weight_grams_total}
          status={assignment.status}
          size="lg"
          fullWidth
          disabled={disabled}
          className="h-11"
        />
      }
    />
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-32" />
      <div className="flex gap-1.5">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <ShipmentMobileCard.Skeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}
