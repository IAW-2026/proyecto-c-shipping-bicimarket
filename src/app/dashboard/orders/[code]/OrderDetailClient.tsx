"use client";
import Link from "next/link";
import { ArrowRight, ChevronLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { OrderStatusBadge } from "@/components/status/OrderStatusBadge";
import { AddressCard } from "@/components/shipping/AddressCard";
import { OrderShipmentFlow } from "@/components/shipping/OrderShipmentFlow";
import { OriginPickupRow } from "@/components/operator/OriginPickupRow";
import { OperatorStatusBanner } from "@/components/operator/OperatorStatusBanner";
import { useShipmentGroup } from "@/hooks/querys/shipments/useShipmentGroup";
import { useBulkShipmentMutations } from "@/hooks/querys/shipments/useBulkShipmentMutations";
import type { ShipmentDTO, OrderPickupSummary } from "@/types/shipments";
import type { AssignmentDTO } from "@/types/assignments";
import type { CreateTrackingEventBody } from "@/types/tracking-events";
import type { OperatorStatus } from "@/types/logistics-operators";

// Mapea un ShipmentDTO (forma del grupo) a la forma AssignmentDTO que consume
// OriginPickupRow (retiro/entrega por envío). is_self_assigned=true: el
// operador está dentro del pedido que ya gestiona.
function asAssignment(s: ShipmentDTO, orderTracking: string): AssignmentDTO {
  return {
    id: s.id,
    order_id: s.order_id,
    seller_profile_id: s.seller_profile_id,
    tracking_number: s.tracking_number,
    order_tracking_number: orderTracking,
    status: s.status,
    pickup_address: s.pickup_address_snapshot,
    shipping_address: s.shipping_address_snapshot,
    weight_grams_total: s.weight_grams_total,
    packages_count: s.packages?.length ?? 0,
    is_self_assigned: true,
  };
}

export function OrderDetailClient({
  code,
  operatorStatus,
}: {
  code: string;
  operatorStatus: OperatorStatus;
}) {
  const { data, isLoading, isError, error, refetch } = useShipmentGroup(code);
  const { bulkAdvanceStatus } = useBulkShipmentMutations();
  const actionsBlocked = operatorStatus !== "active";

  const notFound =
    isError &&
    (error as { response?: { status?: number } }).response?.status === 404;

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={PackageX}
        variant="muted"
        title="No encontramos ese pedido"
        subtitle="Revisá el código del pedido. Si seguís sin verlo, volvé a tu listado."
        cta={{ label: "Volver a mis pedidos", href: "/dashboard/assignments" }}
      />
    );
  }

  if (isError || !data) {
    return (
      <ErrorBanner
        title="No pudimos cargar el pedido"
        subtitle="Reintentá en unos segundos."
        onRetry={() => refetch()}
      />
    );
  }

  const { aggregate, shipments } = data;
  const orderTracking = aggregate.order_tracking_number;

  const pickups: OrderPickupSummary[] = shipments.map((s) => ({
    shipment_id: s.id,
    tracking_number: s.tracking_number,
    pickup_city: s.pickup_address_snapshot.city,
    seller_profile_id: s.seller_profile_id,
    status: s.status,
  }));

  // Avance bulk = atajo para mover varios envíos juntos. Opera solo sobre los
  // envíos ACTIVOS (ni entregados ni terminados con incidencia), así un envío
  // entregado/fallido no bloquea avanzar el resto. Cada envío también se puede
  // avanzar individualmente desde su fila (OriginPickupRow).
  const activeShipments = shipments.filter(
    (s) =>
      s.status !== "delivered" &&
      s.status !== "returned" &&
      s.status !== "failed_delivery",
  );
  const allActivePickedUp =
    activeShipments.length > 0 &&
    activeShipments.every((s) => s.status === "picked_up");
  const allActiveInTransit =
    activeShipments.length > 0 &&
    activeShipments.every((s) => s.status === "in_transit");
  const bulkScope =
    activeShipments.length === shipments.length
      ? "todo el pedido"
      : `los ${activeShipments.length} envíos restantes`;
  const bulkAction = allActivePickedUp
    ? ({ label: `Marcar ${bulkScope} en tránsito`, event: "in_transit" } as const)
    : allActiveInTransit
      ? ({ label: `Marcar ${bulkScope} en reparto`, event: "out_for_delivery" } as const)
      : null;

  function handleBulk() {
    if (!bulkAction) return;
    const body: CreateTrackingEventBody = {
      event_type: bulkAction.event,
      occurred_at: new Date().toISOString(),
    };
    bulkAdvanceStatus.mutate({
      shipmentIds: activeShipments.map((s) => s.id),
      body,
    });
  }

  const pendingPickup = shipments.filter(
    (s) => s.status === "ready_for_pickup",
  ).length;
  const pickedUp = shipments.length - pendingPickup;
  const deliveredCount = shipments.filter(
    (s) => s.status === "delivered",
  ).length;
  const problemCount = shipments.filter(
    (s) => s.status === "failed_delivery" || s.status === "returned",
  ).length;
  const isMulti = shipments.length > 1;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href="/dashboard/assignments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Mis pedidos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pedido
            </p>
            <h1 className="font-mono text-xl font-semibold tracking-tight">
              {orderTracking}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isMulti ? `${shipments.length} vendedores · ` : ""}
              {pickedUp}/{shipments.length} retirados ·{" "}
              {deliveredCount}/{shipments.length} entregados
            </p>
            {deliveredCount < shipments.length &&
              (deliveredCount > 0 || problemCount > 0) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {problemCount > 0
                    ? `${deliveredCount} entregado · ${problemCount} necesita atención (reintentar o devolver).`
                    : `Falta entregar ${shipments.length - deliveredCount} de ${shipments.length} envíos para completar el pedido.`}
                </p>
              )}
          </div>
          <OrderStatusBadge statuses={shipments.map((s) => s.status)} />
        </div>
      </header>

      <OperatorStatusBanner status={operatorStatus} />

      {/* Flujo consolidado del pedido */}
      <OrderShipmentFlow
        pickups={pickups}
        caption={`${isMulti ? `${shipments.length} envíos` : "1 envío"} → ${aggregate.shipping_address.city} · ${deliveredCount}/${shipments.length} entregado`}
      />

      {/* Dirección de entrega del pedido */}
      <AddressCard
        variant="delivery"
        address={aggregate.shipping_address}
        meta="Entrega del pedido"
      />

      {/* Retiro por envío (un vendedor por fila) */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Envíos del pedido ({shipments.length})
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Avanzá cada envío desde su fila (retiro → tránsito → reparto →
          entrega). Si varios están alineados, podés moverlos juntos con el
          botón de abajo. Un envío fallido no bloquea avanzar el resto.
        </p>
        <ul className="space-y-2">
          {shipments.map((s) => (
            <OriginPickupRow
              key={s.id}
              assignment={asAssignment(s, orderTracking)}
              disabled={actionsBlocked}
            />
          ))}
        </ul>
      </section>

      {/* Avance bulk del flujo entero */}
      {bulkAction && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto max-w-2xl">
            <Button
              size="lg"
              className="h-12 w-full"
              disabled={actionsBlocked || bulkAdvanceStatus.isPending}
              onClick={handleBulk}
            >
              <ArrowRight className="size-4" />
              {bulkAction.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
