import { cn } from "@/lib/utils";
import {
  SHIPMENT_STATUS_STYLES,
  OPERATOR_STATUS_STYLES,
  SERVICE_LEVEL_STYLES,
} from "@/lib/status-styles";
import type { ShipmentStatus, ServiceLevel } from "@/types/shipments";
import type { OperatorStatus } from "@/types/logistics-operators";

type Kind = "shipment" | "operator" | "service-level";

interface StatusBadgeProps {
  kind?: Kind;
  status: ShipmentStatus | OperatorStatus | ServiceLevel;
  /** Si false, fuerza ocultar el dot aunque el style lo tenga true. */
  showDot?: boolean;
  /** Override de label si la doc o el contexto lo amerita. */
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Badge único para todos los chips de status del dominio. Lee de status-styles
 * para que el sheet visual sea una sola fuente de verdad.
 */
export function StatusBadge({
  kind = "shipment",
  status,
  showDot,
  label,
  className,
  size = "md",
}: StatusBadgeProps) {
  const style =
    kind === "operator"
      ? OPERATOR_STATUS_STYLES[status as OperatorStatus]
      : kind === "service-level"
        ? SERVICE_LEVEL_STYLES[status as ServiceLevel]
        : SHIPMENT_STATUS_STYLES[status as ShipmentStatus];

  if (!style) return null;

  const dot = showDot ?? style.dot ?? false;
  const padding =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        padding,
        style.classes,
        className,
      )}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current opacity-80" />
      )}
      {label ?? style.label}
    </span>
  );
}
