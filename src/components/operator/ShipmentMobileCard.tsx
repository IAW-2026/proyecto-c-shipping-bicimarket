"use client";
import Link from "next/link";
import { Boxes, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWeightKg } from "@/lib/format";
import { StatusBadge } from "@/components/status/StatusBadge";
import { AddressCard } from "@/components/shipping/AddressCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssignmentDTO } from "@/types/assignments";

interface ShipmentMobileCardProps {
  assignment: AssignmentDTO;
  /** Slot del CTA — viene del TransitionButton del padre porque necesita
   *  manejar sheets/mutations en el contexto del listado. */
  cta?: React.ReactNode;
}

/**
 * Card del listado /dashboard/assignments. Mockup:
 *   operador-mis-envios/Lista _ 5 env_os.png
 *
 * Variantes según `is_self_assigned`:
 *   - true  → card normal con el StatusBadge del shipment.
 *   - false → card en modo "disponible": ring verde claro arriba, pill
 *             "Disponible · Tomalo" reemplazando el badge de status.
 *             Al tocar "Ir a retirar" se auto-asigna (POST tracking-events
 *             con event_type=picked_up).
 */
export function ShipmentMobileCard({
  assignment,
  cta,
}: ShipmentMobileCardProps) {
  const available = !assignment.is_self_assigned;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        available
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <Link
        href={`/dashboard/shipments/${assignment.id}`}
        className="block space-y-3 p-4 hover:bg-muted/30"
      >
        <header className="flex items-start justify-between gap-2">
          <p className="font-mono text-sm font-semibold text-foreground">
            {assignment.tracking_number}
          </p>
          {available ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="size-3" />
              Disponible
            </span>
          ) : (
            <StatusBadge status={assignment.status} size="sm" />
          )}
        </header>

        <div className="space-y-1.5">
          <AddressCard
            variant="pickup"
            address={assignment.pickup_address}
            compact
            hideMaps
          />
          <AddressCard
            variant="delivery"
            address={assignment.shipping_address}
            compact
            hideMaps
          />
        </div>

        <footer className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="size-3.5" />
            {formatWeightKg(assignment.weight_grams_total)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Boxes className="size-3.5" />
            {assignment.packages_count}{" "}
            {assignment.packages_count === 1 ? "bulto" : "bultos"}
          </span>
        </footer>
      </Link>

      {cta && <div className="border-t border-border p-3">{cta}</div>}
    </article>
  );
}

ShipmentMobileCard.Skeleton = function ShipmentMobileCardSkeleton() {
  return (
    <div
      className={cn(
        "space-y-3 overflow-hidden rounded-xl border border-border bg-card p-4",
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
};
