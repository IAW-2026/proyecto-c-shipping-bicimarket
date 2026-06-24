"use client";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressCard } from "@/components/shipping/AddressCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import type { AssignmentGroup } from "@/lib/group-assignments";

interface OrderPickupCardProps {
  group: AssignmentGroup;
  /** Mantenido por compatibilidad; esta card ya no tiene acciones inline. */
  disabled?: boolean;
}

/**
 * ADR-006: card-resumen del listado /dashboard/assignments para pedidos
 * multi-vendedor. NO ejecuta acciones — es navegacional: lleva a la vista
 * detalle del pedido (/dashboard/orders/{BMK}) donde el operador retira cada
 * envío y avanza el flujo entero. Para single-origen se usa ShipmentMobileCard.
 */
export function OrderPickupCard({ group }: OrderPickupCardProps) {
  const orderTracking = group.assignments[0].order_tracking_number;
  const totalWeight = group.assignments.reduce(
    (sum, a) => sum + a.weight_grams_total,
    0,
  );
  const totalPackages = group.assignments.reduce(
    (sum, a) => sum + a.packages_count,
    0,
  );
  const pickedUpCount = group.assignments.length - group.pendingPickupCount;
  const available = !group.assignments[0].is_self_assigned;

  return (
    <Link
      href={`/dashboard/orders/${encodeURIComponent(orderTracking)}`}
      className={cn(
        "block overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/30",
        available
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
              {orderTracking}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              group.allPickedUp
                ? "border border-emerald-600/30 bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
                : available
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "border border-border bg-muted text-muted-foreground",
            )}
          >
            {available && !group.allPickedUp && <Sparkles className="size-3" />}
            {pickedUpCount}/{group.assignments.length} retirados
          </span>
        </header>

        {available && !group.allPickedUp && (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            Disponible. Al abrirlo y retirar el primer origen tomás el pedido
            completo (todos los vendedores).
          </p>
        )}

        <AddressCard
          variant="delivery"
          address={group.shippingAddress}
          compact
          hideMaps
        />

        <ul className="space-y-1.5">
          {group.assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-foreground">
                  {a.tracking_number}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.pickup_address.city}, {a.pickup_address.province}
                </p>
              </div>
              <StatusBadge status={a.status} size="sm" />
            </li>
          ))}
        </ul>

        <footer className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>Peso total · {(totalWeight / 1000).toFixed(2)} kg</span>
          <span>
            {totalPackages} {totalPackages === 1 ? "bulto" : "bultos"}
          </span>
          <span className="ml-auto inline-flex items-center gap-0.5 text-primary">
            Abrir pedido <ChevronRight className="size-3" />
          </span>
        </footer>
      </div>
    </Link>
  );
}
