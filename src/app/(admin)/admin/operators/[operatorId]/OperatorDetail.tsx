"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { OperatorAvatar } from "@/components/operator/OperatorAvatar";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useLogisticsOperator } from "@/hooks/querys/logistics-operators/useLogisticsOperator";
import { useOperatorPerformance } from "@/hooks/querys/logistics-operators/useOperatorPerformance";
import { useOperatorActiveAssignments } from "@/hooks/querys/logistics-operators/useOperatorActiveAssignments";
import { useLogisticsOperatorMutations } from "@/hooks/querys/logistics-operators/useLogisticsOperatorMutations";
import {
  formatDateLong,
  formatWeightKg,
  truncateId,
} from "@/lib/format";
import { VEHICLE_LABELS } from "@/lib/status-styles";

export function OperatorDetail({ operatorId }: { operatorId: string }) {
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const {
    data: operator,
    isLoading,
    isError,
    refetch,
  } = useLogisticsOperator(operatorId);
  const { data: performance } = useOperatorPerformance(operatorId);
  const { data: active } = useOperatorActiveAssignments(operatorId);
  const { patchOperator } = useLogisticsOperatorMutations(operatorId);

  if (isLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (isError || !operator) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/operators"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Volver a operadores
        </Link>
        <ErrorBanner
          title="No pudimos cargar el operador"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isSuspended = operator.status === "suspended";
  const isInactive = operator.status === "inactive";
  const successRate = performance?.success_rate ?? 0;

  function copyClerkId() {
    if (!operator) return;
    navigator.clipboard.writeText(operator.clerk_user_id);
    toast.success("Clerk User ID copiado");
  }

  function suspend() {
    patchOperator.mutate(
      { status: "suspended" },
      { onSuccess: () => setConfirmSuspend(false) },
    );
  }
  function reactivate() {
    patchOperator.mutate({ status: "active" });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/operators"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver a operadores
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OperatorAvatar
            name={operator.full_name}
            status={operator.status}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {operator.full_name}
              </h1>
              <StatusBadge kind="operator" status={operator.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {VEHICLE_LABELS[operator.vehicle_type]} ·{" "}
              <span className="font-mono">{operator.license_plate}</span> · Alta
              el {formatDateLong(operator.created_at)}
            </p>
          </div>
        </div>


      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Col izq */}
        <div className="space-y-4 lg:col-span-2">
          {/* Información */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Email" value={operator.email} />
              <Field label="Teléfono" value={operator.phone} />
              <Field label="DNI" value={operator.document_id} />
              <Field
                label="Vehículo"
                value={VEHICLE_LABELS[operator.vehicle_type]}
              />
              <Field
                label="Patente"
                value={<span className="font-mono">{operator.license_plate}</span>}
              />
              <Field
                label="Estado"
                value={
                  <StatusBadge
                    kind="operator"
                    status={operator.status}
                    size="sm"
                  />
                }
              />
            </dl>
          </section>

          {/* Performance */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Performance · últimos 30 días
              </h2>
            </div>

            {performance ? (
              <>
                <div className="grid grid-cols-3 gap-4 pb-4">
                  <Stat
                    label="Entregados"
                    value={performance.delivered}
                    tone="primary"
                  />
                  <Stat
                    label="Fallidas"
                    value={performance.failed}
                    tone="destructive"
                  />
                  <Stat
                    label="Tasa de éxito"
                    value={`${successRate}%`}
                    tone="muted"
                  />
                </div>
                <BarChart30D data={performance.daily} />
              </>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </section>

          {/* Assignments activos */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assignments activos ({active?.data.length ?? 0})
            </h2>
            {active?.data.length ? (
              <ul className="divide-y divide-border text-sm">
                {active.data.map((a) => (
                  <li
                    key={a.shipment_id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <Link
                      href={`/admin/shipments/${a.shipment_id}`}
                      className="flex flex-1 items-center gap-3 hover:text-foreground"
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold">
                          {a.tracking_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.shipping_address.city} ·{" "}
                          {formatWeightKg(a.weight_grams_total)}
                        </p>
                      </div>
                    </Link>
                    <StatusBadge status={a.status} size="sm" />
                    <Link
                      href={`/admin/shipments/${a.shipment_id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Ver detalle del envío"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin envíos activos en este momento.
              </p>
            )}
          </section>
        </div>

        {/* Col der */}
        <div className="space-y-4">
          {/* Acceso */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acceso
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="space-y-1">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Clerk User ID
                </dt>
                <dd>
                  <button
                    type="button"
                    onClick={copyClerkId}
                    className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary"
                  >
                    {truncateId(operator.clerk_user_id, 14, 4)}
                    <Copy className="size-3 opacity-50" />
                  </button>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Operador ID
                </dt>
                <dd className="font-mono text-xs text-muted-foreground">
                  {operator.id}
                </dd>
              </div>
            </dl>
          </section>

          {/* Acciones */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones
            </h2>
                   <div className="flex flex-wrap items-center gap-2">
          {isSuspended || isInactive ? (
            <Button
              size="sm"
              onClick={reactivate}
              disabled={patchOperator.isPending}
            >
              Reactivar
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmSuspend(true)}
              disabled={patchOperator.isPending}
            >
              Suspender
            </Button>
          )}
        </div>
          </section>

        
        </div>
      </div>

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender operador</AlertDialogTitle>
            <AlertDialogDescription>
              El operador <strong>{operator.full_name}</strong> no podrá
              loguearse hasta que lo reactivas. Sus envíos activos no se
              reasignan automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={suspend}
              disabled={patchOperator.isPending}
            >
              Sí, suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "primary" | "destructive" | "muted";
}) {
  const valueColor =
    tone === "primary"
      ? "text-primary"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-heading text-2xl font-semibold tabular-nums ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function BarChart30D({
  data,
}: {
  data: Array<{ date: string; delivered: number; failed: number }>;
}) {
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;

  const max = Math.max(
    1,
    ...data.map((d) => d.delivered + d.failed),
  );

  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex flex-1 flex-col-reverse"
            title={`${d.date}: ${d.delivered} OK, ${d.failed} fallidas`}
          >
            <div
              className="rounded-sm bg-primary"
              style={{ height: `${(d.delivered / max) * 100}%` }}
            />
            {d.failed > 0 && (
              <div
                className="rounded-sm bg-destructive/70"
                style={{ height: `${(d.failed / max) * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{firstDate(data)}</span>
        <span>{midDate(data)}</span>
        <span>{lastDate(data)}</span>
      </div>
    </div>
  );
}

function firstDate(data: Array<{ date: string }>) {
  return shortDate(data[0]?.date);
}
function midDate(data: Array<{ date: string }>) {
  return shortDate(data[Math.floor(data.length / 2)]?.date);
}
function lastDate(data: Array<{ date: string }>) {
  return shortDate(data[data.length - 1]?.date);
}
function shortDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}
