"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  Mail,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { AddressCard } from "@/components/shipping/AddressCard";
import { TrackingTimeline } from "@/components/shipping/TrackingTimeline";
import { DeliveryProofCard } from "@/components/shipping/DeliveryProofCard";
import { ShipmentRouteMap } from "@/components/shipping/ShipmentRouteMap";
import { AuditHistoryTable } from "@/components/admin/AuditHistoryTable";
import { AssignOperatorDialog } from "@/components/admin/AssignOperatorDialog";
import { OverrideStatusDialog } from "@/components/admin/OverrideStatusDialog";
import { OperatorAvatar } from "@/components/operator/OperatorAvatar";
import { VehicleIcon } from "@/components/operator/VehicleIcon";
import { useShipment } from "@/hooks/querys/shipments/useShipment";
import { useTrackingEvents } from "@/hooks/querys/shipments/useTrackingEvents";
import { useShipmentStatusHistory } from "@/hooks/querys/shipments/useShipmentStatusHistory";
import { useShipmentAssignments } from "@/hooks/querys/assignments/useShipmentAssignments";
import { useRetryShipment } from "@/hooks/querys/shipments/useRetryShipment";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import {
  formatArs,
  formatDateShort,
  formatWeightKg,
  truncateId,
} from "@/lib/format";
import { SERVICE_LEVEL_STYLES } from "@/lib/status-styles";

interface ShipmentAdminDetailProps {
  shipmentId: string;
}

export function ShipmentAdminDetail({ shipmentId }: ShipmentAdminDetailProps) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const { data: shipment, isLoading, isError, refetch } = useShipment(shipmentId);
  const { data: tracking } = useTrackingEvents(shipmentId);
  const { data: history } = useShipmentStatusHistory(shipmentId);
  const { data: assignmentsResp } = useShipmentAssignments(shipmentId);
  const retry = useRetryShipment();

  // Assignment activo (status in [assigned, accepted, picked_up]) — el detalle
  // muestra ese (no los históricos). Pueden existir varios de operadores
  // pasados con status `reassigned/cancelled/delivered` pero nos interesa el
  // que todavía está en juego.
  const currentAssignment = assignmentsResp?.data.find((a) =>
    ["assigned", "accepted", "picked_up"].includes(a.status),
  ) ?? null;

  function handleRetry() {
    retry.mutate(shipmentId, {
      onSuccess: (created) => router.push(`/admin/shipments/${created.id}`),
    });
  }

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-72" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (isError || !shipment) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Volver a envíos
        </Link>
        <ErrorBanner
          title="No pudimos cargar el envío"
          subtitle="Reintentá o volvé al listado."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  function copy(text: string, what = "Copiado") {
    navigator.clipboard.writeText(text);
    toast.success(`${what}: ${text}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver a envíos
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold">
              {shipment.tracking_number}
            </h1>
            <StatusBadge status={shipment.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={shipment.label_url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="size-3.5" /> Etiqueta
            </a>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setOverrideOpen(true)}
            >
              <RotateCcw className="size-3.5" /> Override status
            </Button>
          </div>
        </div>
      </div>

      {/* Mapa de ruta */}
      <ShipmentRouteMap
        status={shipment.status}
        caption={(() => {
          const km = distanceBetweenPostalCodes(
            shipment.pickup_address_snapshot.postal_code,
            shipment.shipping_address_snapshot.postal_code,
          );
          return km != null
            ? `≈ ${km} km · ${shipment.pickup_address_snapshot.city} → ${shipment.shipping_address_snapshot.city}`
            : `${shipment.pickup_address_snapshot.city} → ${shipment.shipping_address_snapshot.city}`;
        })()}
        failureAction={
          shipment.status === "failed_delivery" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={retry.isPending}
              className="border-destructive/40 text-destructive hover:bg-destructive/15"
            >
              <RefreshCcw className="size-3.5" />
              {retry.isPending ? "Creando…" : "Crear nuevo envío"}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Col izq */}
        <div className="space-y-4 lg:col-span-2">
          {/* Resumen */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <CopyField
                label="Order ID"
                value={shipment.order_id}
                onCopy={() => copy(shipment.order_id, "Order ID")}
              />
              <CopyField
                label="Sales Order ID"
                value={shipment.sales_order_id}
                onCopy={() => copy(shipment.sales_order_id, "Sales Order ID")}
              />
              <CopyField
                label="Buyer Profile"
                value={shipment.buyer_profile_id}
                onCopy={() => copy(shipment.buyer_profile_id, "Buyer Profile")}
              />
              <CopyField
                label="Seller Profile"
                value={shipment.seller_profile_id}
                onCopy={() => copy(shipment.seller_profile_id, "Seller Profile")}
              />
              <StaticField label="Carrier" value={shipment.carrier} />
              <StaticField
                label="Servicio"
                value={
                  SERVICE_LEVEL_STYLES[shipment.service_level]?.label ??
                  shipment.service_level
                }
              />
              <StaticField
                label="Peso total"
                value={formatWeightKg(shipment.weight_grams_total)}
              />
              <StaticField
                label="Costo"
                value={formatArs(shipment.cost_cents)}
              />
              <StaticField
                label="Despachado"
                value={
                  shipment.shipped_at
                    ? formatDateShort(shipment.shipped_at)
                    : "—"
                }
              />
              <StaticField
                label="Entregado"
                value={
                  shipment.delivered_at
                    ? formatDateShort(shipment.delivered_at)
                    : "—"
                }
              />
            </dl>
          </section>

          {/* Direcciones */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direcciones
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <AddressCard
                variant="pickup"
                address={shipment.pickup_address_snapshot}
              />
              <AddressCard
                variant="delivery"
                address={shipment.shipping_address_snapshot}
              />
            </div>
          </section>

          {/* Paquetes */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paquetes ({shipment.packages?.length ?? 0})
            </h2>
            {shipment.packages?.length ? (
              <ul className="space-y-2 text-sm">
                {shipment.packages.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    <span>
                      <span className="font-medium">Caja {i + 1}</span>
                      {p.description ? ` — ${p.description}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.length_cm}×{p.width_cm}×{p.height_cm} cm ·{" "}
                      {formatWeightKg(p.weight_grams)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin paquetes registrados.
              </p>
            )}
          </section>

          {/* Prueba de entrega (solo cuando ya fue entregado/devuelto) */}
          <DeliveryProofCard shipmentId={shipment.id} status={shipment.status} />

          {/* Tracking events */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tracking events
            </h2>
            <TrackingTimeline events={tracking?.data ?? []} />
          </section>

          {/* Audit history */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audit history
            </h2>
            <AuditHistoryTable history={history?.data ?? []} />
          </section>
        </div>

        {/* Col der */}
        <div className="space-y-4">
          {/* Asignación */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Asignación
            </h2>
            {currentAssignment ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <OperatorAvatar
                    name={currentAssignment.operator.full_name}
                    status={currentAssignment.operator.status}
                    size="md"
                  />
                  <div className="flex-1 space-y-0.5">
                    <Link
                      href={`/admin/operators/${currentAssignment.operator.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {currentAssignment.operator.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <VehicleIcon
                        vehicle={currentAssignment.operator.vehicle_type}
                        className="mr-1"
                      />
                      {VEHICLE_LABELS[currentAssignment.operator.vehicle_type]}{" "}
                      ·{" "}
                      <span className="font-mono">
                        {currentAssignment.operator.license_plate}
                      </span>
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {currentAssignment.operator.id}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                  >
                    Reasignar operador
                  </Button>
                  <a
                    href={`mailto:${currentAssignment.operator.email}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                    })}
                  >
                    <Mail className="size-3.5" /> Contactar
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sin operador asignado.
                </p>
                <Button onClick={() => setAssignOpen(true)} size="sm">
                  Asignar operador
                </Button>
              </div>
            )}
          </section>

          {/* Acciones admin */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones admin
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOverrideOpen(true)}
                className="justify-start"
              >
                Override status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copy(
                    [
                      shipment.id,
                      shipment.order_id,
                      shipment.sales_order_id,
                    ].join(", "),
                    "IDs",
                  )
                }
                className="justify-start"
              >
                <Copy className="size-3.5" /> Copiar IDs
              </Button>
              <a
                href={shipment.label_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                <ExternalLink className="size-3.5" /> Descargar etiqueta
              </a>
            </div>
          </section>

          {/* Reclamos placeholder */}
          <section className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Sin reclamos del comprador.
          </section>
        </div>
      </div>

      {/* Dialogs */}
      <AssignOperatorDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        shipmentId={shipment.id}
        trackingNumber={shipment.tracking_number}
        currentAssignment={
          currentAssignment
            ? {
                assignmentId: currentAssignment.id,
                operatorName: currentAssignment.operator.full_name,
              }
            : undefined
        }
      />
      <OverrideStatusDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        shipmentId={shipment.id}
        trackingNumber={shipment.tracking_number}
        currentStatus={shipment.status}
      />
    </div>
  );
}

function CopyField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary"
          title="Click para copiar"
        >
          <span>{truncateId(value, 10, 4)}</span>
          <Copy className="size-3 opacity-50" />
        </button>
      </dd>
    </div>
  );
}

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

