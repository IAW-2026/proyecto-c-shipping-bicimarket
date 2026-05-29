"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { AddressCard } from "@/components/shipping/AddressCard";
import { TrackingTimeline } from "@/components/shipping/TrackingTimeline";
import { ShipmentRouteMap } from "@/components/shipping/ShipmentRouteMap";
import { OrderShipmentFlow } from "@/components/shipping/OrderShipmentFlow";
import { DeliveryProofCard } from "@/components/shipping/DeliveryProofCard";
import { TransitionButton } from "@/components/operator/TransitionButton";
import { OperatorStatusBanner } from "@/components/operator/OperatorStatusBanner";
import { useShipment } from "@/hooks/querys/shipments/useShipment";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";
import { useTrackingEvents } from "@/hooks/querys/shipments/useTrackingEvents";
import { useRetryShipment } from "@/hooks/querys/shipments/useRetryShipment";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { formatWeightKg } from "@/lib/format";
import { SERVICE_LEVEL_STYLES } from "@/lib/status-styles";
import type { OperatorStatus } from "@/types/logistics-operators";

interface OperatorShipmentDetailProps {
  shipmentId: string;
  operatorStatus: OperatorStatus;
}

/**
 * Detalle de envío para el operador. Cubre los mockups:
 *   operador-detalle-de-envio/Status _ A retirar.png
 *   operador-detalle-de-envio/Status _ En tr_nsito.png
 *   operador-detalle-de-envio/Status _ En reparto.png
 *
 * Los sheets (PickupConfirm, DeliveryConfirm) los abre TransitionButton
 * según el status del shipment.
 */
export function OperatorShipmentDetail({
  shipmentId,
  operatorStatus,
}: OperatorShipmentDetailProps) {
  const router = useRouter();
  const { data: shipment, isLoading, isError, refetch } = useShipment(shipmentId);
  const { data: trackingEvents } = useTrackingEvents(shipmentId);
  const retry = useRetryShipment();
  const actionsBlocked = operatorStatus !== "active";

  function handleRetry() {
    retry.mutate(shipmentId, {
      onSuccess: () => {
        // Volvemos al listado — el nuevo envío aparece como "Disponible"
        // para que cualquier operador (incluido este) lo tome.
        router.push("/dashboard/assignments");
      },
    });
  }

  if (isLoading) {
    return <SkeletonDetail />;
  }

  if (isError || !shipment) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/assignments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
        <ErrorBanner
          title="No pudimos cargar el envío"
          subtitle="Reintentá o volvé al listado."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const buyerNameFromSnapshot =
    (shipment.shipping_address_snapshot as { receiver_name?: string })
      ?.receiver_name ?? null;
  const products =
    shipment.packages?.map((p) => p.description).filter(Boolean).join(", ") ||
    "Paquete sin descripción";

  const orderPickups = shipment.order_pickups ?? [];
  const isMultiOrigin = orderPickups.length > 1;
  const hasDistinctOrderTracking =
    shipment.order_tracking_number &&
    shipment.order_tracking_number !== shipment.tracking_number;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard/assignments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Volver al listado"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-mono text-sm font-semibold">
            {shipment.tracking_number}
          </p>
          {hasDistinctOrderTracking && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Pedido · {shipment.order_tracking_number}
            </p>
          )}
        </div>
        <StatusBadge status={shipment.status} size="sm" />
      </header>

      {/* Banner si el operador está suspended/inactive */}
      <OperatorStatusBanner status={operatorStatus} />

      {/* ADR-006: banner cuando el envío es parte de un pedido multi-vendedor */}
      {isMultiOrigin && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p>
              Estás viendo el envío de un vendedor. Vos gestionás el{" "}
              <strong>pedido completo</strong> (
              <span className="font-mono">
                {shipment.order_tracking_number}
              </span>
              ) — <strong>{orderPickups.length}</strong> vendedores. El flujo de
              abajo muestra todos los retiros y el estado consolidado.
            </p>
            <Link
              href="/dashboard/assignments"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Volver a mis pedidos
              <ChevronLeft className="size-3 rotate-180" />
            </Link>
          </div>
        </div>
      )}

      {/* Línea secundaria */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          SERVICIO ·{" "}
          <span className="font-medium text-foreground">
            {SERVICE_LEVEL_STYLES[shipment.service_level]?.label ??
              shipment.service_level}
          </span>
        </span>
        {buyerNameFromSnapshot && (
          <>
            <span>·</span>
            <span>
              COMPRADOR ·{" "}
              <span className="font-medium text-foreground">
                {buyerNameFromSnapshot}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Diagrama de flujo: si es multi-vendedor mostramos el flow consolidado,
          si no, el ShipmentRouteMap lineal de siempre. */}
      {isMultiOrigin ? (
        <OrderShipmentFlow
          pickups={orderPickups}
          highlightShipmentId={shipment.id}
          caption={`Pedido · ${shipment.shipping_address_snapshot.city} · ${orderPickups.length} orígenes`}
        />
      ) : (
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
          })()
        }
          failureAction={
            shipment.status === "failed_delivery" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={actionsBlocked || retry.isPending}
                className="border-destructive/40 text-destructive hover:bg-destructive/15"
              >
                <RefreshCcw className="size-3.5" />
                {retry.isPending ? "Creando…" : "Crear nuevo envío"}
              </Button>
            ) : null
          }
        />
      )}

      {/* Direcciones */}
      <div className="space-y-3">
        <AddressCard
          variant="pickup"
          address={shipment.pickup_address_snapshot}
          meta="Vendedor"
        />
        <AddressCard
          variant="delivery"
          address={shipment.shipping_address_snapshot}
          meta={buyerNameFromSnapshot ? `Recibe ${buyerNameFromSnapshot}` : undefined}
        />
      </div>

      {/* Detalle */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Detalle del envío
        </h2>
        <dl className="space-y-2 text-sm">
          <DetailRow label="Producto" value={products} />
          <DetailRow
            label="Bultos"
            value={
              shipment.packages?.length
                ? `${shipment.packages.length} ${shipment.packages.length === 1 ? "bulto" : "bultos"}`
                : "—"
            }
          />
          <DetailRow
            label="Peso total"
            value={formatWeightKg(shipment.weight_grams_total)}
          />
          <DetailRow label="Carrier" value={shipment.carrier} />
        </dl>
      </section>

      {/* Prueba de entrega (solo cuando ya fue entregado) */}
      <DeliveryProofCard shipmentId={shipment.id} status={shipment.status} />

      {/* Timeline */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historial
        </h2>
        <TrackingTimeline events={trackingEvents?.data ?? []} />
      </section>

      {/* CTA sticky bottom */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] space-y-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <TransitionButton
          shipmentId={shipment.id}
          trackingNumber={shipment.tracking_number}
          weightGrams={shipment.weight_grams_total}
          status={shipment.status}
          size="lg"
          fullWidth
          disabled={actionsBlocked}
          className="h-12 text-base"
        />
        <FailureToggleButton
          shipmentId={shipment.id}
          status={shipment.status}
          disabled={actionsBlocked}
        />
      </div>
    </div>
  );
}

/**
 * Botón secundario para marcar entrega como fallida. Aparece solo en los
 * estados desde los que la transición a failed_delivery es válida
 * (in_transit, out_for_delivery — ver lib/transitions.ts).
 *
 * Después de marcar fallida, el banner rojo del mapa muestra el botón
 * "Crear nuevo envío" que clona el shipment para que otro operador lo tome.
 */
function FailureToggleButton({
  shipmentId,
  status,
  disabled = false,
}: {
  shipmentId: string;
  status: import("@/types/shipments").ShipmentStatus;
  disabled?: boolean;
}) {
  const { addTrackingEvent } = useShipmentMutations(shipmentId);
  const canFail = status === "in_transit" || status === "out_for_delivery";
  if (!canFail) return null;

  function handle() {
    addTrackingEvent.mutate({
      event_type: "failed_delivery",
      occurred_at: new Date().toISOString(),
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={disabled || addTrackingEvent.isPending}
      className="w-full text-destructive hover:bg-destructive/10"
    >
      Marcar entrega fallida
    </Button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </header>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
