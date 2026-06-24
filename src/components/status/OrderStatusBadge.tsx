import { cn } from "@/lib/utils";
import { rollupShipmentStatus, isPartialDelivery } from "@/lib/shipment-rollup";
import { StatusBadge } from "./StatusBadge";
import type { ShipmentStatus } from "@/types/shipments";

interface OrderStatusBadgeProps {
  /** Estados de los N envíos del pedido. */
  statuses: ShipmentStatus[];
  size?: "sm" | "md";
  className?: string;
}

/**
 * Badge de estado a nivel PEDIDO (grupo BMK). Es el `StatusBadge` del rollup,
 * salvo en el caso de ENTREGA PARCIAL (al menos un envío entregado + al menos
 * otro fallido/devuelto): ahí el rollup de la DB queda en `failed_delivery`/
 * `returned` por prioridad, pero a nivel pedido mostramos "Entrega parcial"
 * (estado derivado de UI, no de la DB — ver `isPartialDelivery`). Así un envío
 * ya entregado no queda "tapado" por el fallo de otro.
 */
export function OrderStatusBadge({
  statuses,
  size = "md",
  className,
}: OrderStatusBadgeProps) {
  if (isPartialDelivery(statuses)) {
    const padding =
      size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
          "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          padding,
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-current opacity-80" />
        Entrega parcial
      </span>
    );
  }

  return (
    <StatusBadge
      status={rollupShipmentStatus(statuses)}
      size={size}
      className={className}
    />
  );
}
