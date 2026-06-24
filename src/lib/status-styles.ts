import type { ShipmentStatus, ServiceLevel } from "@/types/shipments";
import type { OperatorStatus, VehicleType } from "@/types/logistics-operators";

// Fuente de verdad visual de chips/badges del dominio. Materializa el sheet
// `desing -references/Status sheet _ shipment _ operator.png`. Si cambia
// la paleta o se agrega un estado, se toca acá y se propaga a toda la app.

export interface StatusStyle {
  label: string;
  /** Clases Tailwind. Usan tokens shadcn para que dark mode funcione solo. */
  classes: string;
  /** Si true, el StatusBadge muestra un punto coloreado a la izquierda. */
  dot?: boolean;
}

// ── Shipment ──────────────────────────────────────────────────────────────

export const SHIPMENT_STATUS_STYLES: Record<ShipmentStatus, StatusStyle> = {
  created: {
    label: "Creado",
    classes: "border border-border bg-transparent text-muted-foreground",
  },
  ready_for_pickup: {
    label: "A retirar",
    classes: "border border-border bg-transparent text-foreground",
  },
  picked_up: {
    label: "Retirado",
    classes:
      "border border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dot: true,
  },
  in_transit: {
    label: "En tránsito",
    classes:
      "border border-blue-600/30 bg-blue-600/15 text-blue-700 dark:text-blue-300",
    dot: true,
  },
  out_for_delivery: {
    label: "En reparto",
    classes:
      "border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dot: true,
  },
  delivered: {
    label: "Entregado",
    classes:
      "border border-emerald-600/30 bg-emerald-600/15 text-emerald-700 dark:text-emerald-300",
    dot: true,
  },
  failed_delivery: {
    label: "Entrega fallida",
    classes:
      "border border-orange-600/30 bg-orange-600/15 text-orange-700 dark:text-orange-300",
    dot: true,
  },
  returned: {
    label: "Devuelto",
    classes:
      "border border-destructive/30 bg-destructive/15 text-destructive",
    dot: true,
  },
};

// ── Operator ──────────────────────────────────────────────────────────────

export const OPERATOR_STATUS_STYLES: Record<OperatorStatus, StatusStyle> = {
  active: {
    label: "Activo",
    classes:
      "border border-primary/30 bg-primary/15 text-primary",
    dot: true,
  },
  inactive: {
    label: "Inactivo",
    classes: "border border-border bg-muted text-muted-foreground",
  },
  suspended: {
    label: "Suspendido",
    classes:
      "border border-destructive/30 bg-destructive/15 text-destructive",
    dot: true,
  },
};

// ── Service level ─────────────────────────────────────────────────────────

export const SERVICE_LEVEL_STYLES: Record<ServiceLevel, StatusStyle> = {
  standard: {
    label: "Estándar",
    classes: "border border-border bg-muted text-muted-foreground",
  },
  express: {
    label: "Express",
    classes:
      "border border-blue-600/30 bg-blue-600/15 text-blue-700 dark:text-blue-300",
  },
  same_day: {
    label: "Mismo día",
    classes:
      "border border-primary/30 bg-primary/15 text-primary",
  },
};

// ── Vehicle type ──────────────────────────────────────────────────────────

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: "Moto",
  car: "Auto",
  van: "Van",
  truck: "Camión",
};

// ── CTA del operador según status ─────────────────────────────────────────
// Mapea el status actual del shipment al "próximo paso" que el operador
// debe tomar. La label aparece en los CTA full-width de las cards de
// /dashboard/assignments y en el sticky del detalle.

export interface OperatorTransition {
  label: string;
  /** Tipo de UI que abre el botón. */
  action:
    | "open-pickup-sheet" // ready_for_pickup → picked_up (con sheet)
    | "mutate-in-transit" // picked_up → in_transit (directo)
    | "mutate-out-for-delivery" // in_transit → out_for_delivery (directo)
    | "open-deliver-sheet" // out_for_delivery → delivered (con sheet pesado)
    | "none"; // estados terminales / sin acción
}

export const OPERATOR_TRANSITIONS: Record<ShipmentStatus, OperatorTransition> = {
  created: { label: "—", action: "none" },
  ready_for_pickup: { label: "Ir a retirar", action: "open-pickup-sheet" },
  picked_up: { label: "Marcar en tránsito", action: "mutate-in-transit" },
  in_transit: {
    label: "Marcar en reparto",
    action: "mutate-out-for-delivery",
  },
  out_for_delivery: {
    label: "Marcar entregado",
    action: "open-deliver-sheet",
  },
  delivered: { label: "Envío finalizado", action: "none" },
  failed_delivery: { label: "Reintentar", action: "mutate-in-transit" },
  returned: { label: "Devuelto", action: "none" },
};
