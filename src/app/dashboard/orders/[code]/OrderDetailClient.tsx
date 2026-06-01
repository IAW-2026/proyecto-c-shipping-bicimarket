"use client";
import Link from "next/link";
import { ArrowRight, ChevronLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { StatusBadge } from "@/components/status/StatusBadge";
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

  // Avance bulk del flujo consolidado: solo cuando TODOS los envíos están en
  // picked_up (→ in_transit) o todos en in_transit (→ out_for_delivery). El
  // delivered final requiere prueba por envío (botón "Entregar" en cada fila).
  const allPickedUp =
    shipments.length > 0 && shipments.every((s) => s.status === "picked_up");
  const allInTransit =
    shipments.length > 0 && shipments.every((s) => s.status === "in_transit");
  const bulkAction = allPickedUp
    ? ({ label: "Marcar todo el pedido en tránsito", event: "in_transit" } as const)
    : allInTransit
      ? ({
          label: "Marcar todo el pedido en reparto",
          event: "out_for_delivery",
        } as const)
      : null;

  function handleBulk() {
    if (!bulkAction) return;
    const body: CreateTrackingEventBody = {
      event_type: bulkAction.event,
      occurred_at: new Date().toISOString(),
    };
    bulkAdvanceStatus.mutate({
      shipmentIds: shipments.map((s) => s.id),
      body,
    });
  }

  const pendingPickup = shipments.filter(
    (s) => s.status === "ready_for_pickup",
  ).length;
  const pickedUp = shipments.length - pendingPickup;
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
              {pickedUp}/{shipments.length} retirados
            </p>
          </div>
          <StatusBadge status={aggregate.rollup_status} />
        </div>
      </header>

      <OperatorStatusBanner status={operatorStatus} />

      {/* Flujo consolidado del pedido */}
      <OrderShipmentFlow
        pickups={pickups}
        caption={`${isMulti ? `${shipments.length} vendedores` : "1 vendedor"} → ${aggregate.shipping_address.city}`}
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
          Retirá cada envío en su origen. Cuando estén todos retirados, avanzá
          el pedido completo de una.
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
