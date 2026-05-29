"use client";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddressCard } from "@/components/shipping/AddressCard";
import { OriginPickupRow } from "./OriginPickupRow";
import { useBulkShipmentMutations } from "@/hooks/querys/shipments/useBulkShipmentMutations";
import type { AssignmentGroup } from "@/lib/group-assignments";
import type { CreateTrackingEventBody } from "@/types/tracking-events";

interface OrderPickupCardProps {
  group: AssignmentGroup;
  disabled?: boolean;
}

/**
 * Card del listado /dashboard/assignments para pedidos multi-vendedor.
 * Agrupa N shipments del mismo order_id (ADR-005). El operador retira
 * cada origen individualmente (OriginPickupRow) y cuando todos están en
 * picked_up, se habilita un CTA bulk que avanza todos los shipments al
 * próximo estado consolidado.
 *
 * Para órdenes single-origen seguimos usando ShipmentMobileCard +
 * TransitionButton — esta card solo se renderiza cuando isMultiOrigin.
 */
export function OrderPickupCard({
  group,
  disabled = false,
}: OrderPickupCardProps) {
  const { bulkAdvanceStatus } = useBulkShipmentMutations();

  const totalWeight = group.assignments.reduce(
    (sum, a) => sum + a.weight_grams_total,
    0,
  );
  const totalPackages = group.assignments.reduce(
    (sum, a) => sum + a.packages_count,
    0,
  );
  const pickedUpCount = group.assignments.length - group.pendingPickupCount;
  const someAvailable = group.assignments.some((a) => !a.is_self_assigned);

  // Bulk CTA: solo aplica cuando todos los shipments están en picked_up
  // (avance consolidado a in_transit) o todos en in_transit (a out_for_delivery).
  // Para out_for_delivery → delivered se requiere proof por shipment;
  // ese caso se maneja yendo al detalle individual (sprint 1).
  const allPickedUp = group.assignments.every((a) => a.status === "picked_up");
  const allInTransit = group.assignments.every(
    (a) => a.status === "in_transit",
  );
  const bulkAction = allPickedUp
    ? ({ label: "Marcar todos en tránsito", event: "in_transit" } as const)
    : allInTransit
      ? ({
          label: "Marcar todos en reparto",
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
      shipmentIds: group.assignments.map((a) => a.id),
      body,
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        someAvailable
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="space-y-3 p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Pedido multi-vendedor
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {group.assignments[0].order_tracking_number}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {group.orderId}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              group.allPickedUp
                ? "border border-emerald-600/30 bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
                : someAvailable
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "border border-border bg-muted text-muted-foreground",
            )}
          >
            {someAvailable && !group.allPickedUp && (
              <Sparkles className="size-3" />
            )}
            {pickedUpCount}/{group.assignments.length} retirados
          </span>
        </header>

        {someAvailable && !group.allPickedUp && (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            Al retirar el primer origen tomás el pedido completo (todos los
            vendedores). Otro operador ya no podrá tomarlo.
          </p>
        )}

        <AddressCard
          variant="delivery"
          address={group.shippingAddress}
          compact
          hideMaps
        />

        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Orígenes ({group.assignments.length})
        </p>
        <ul className="space-y-2">
          {group.assignments.map((a) => (
            <OriginPickupRow
              key={a.id}
              assignment={a}
              disabled={disabled}
            />
          ))}
        </ul>

        <footer className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>Peso total · {(totalWeight / 1000).toFixed(2)} kg</span>
          <span>
            {totalPackages} {totalPackages === 1 ? "bulto" : "bultos"}
          </span>
        </footer>
      </div>

      {bulkAction && (
        <div className="border-t border-border p-3">
          <Button
            size="lg"
            className="h-11 w-full"
            disabled={disabled || bulkAdvanceStatus.isPending}
            onClick={handleBulk}
          >
            <ArrowRight className="size-4" />
            {bulkAction.label}
          </Button>
        </div>
      )}
    </article>
  );
}
