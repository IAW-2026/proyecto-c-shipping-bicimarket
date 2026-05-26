"use client";
import { useMemo } from "react";
import {
  Background,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  Home,
  MapPin,
  Package as PackageIcon,
  RefreshCcw,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipmentStatus } from "@/types/shipments";

// El mapa muestra solo el "camino feliz": retiro → entregado. Cuando el
// shipment está en failed_delivery o returned, todos los nodos quedan en
// gris (sin animación) y debajo aparece un banner rojo con el detalle.

type StageKey =
  | "ready_for_pickup"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

interface StageDef {
  key: StageKey;
  label: string;
  icon: typeof PackageIcon;
}

const STAGES: StageDef[] = [
  { key: "ready_for_pickup", label: "A retirar", icon: MapPin },
  { key: "picked_up", label: "Retirado", icon: PackageIcon },
  { key: "in_transit", label: "En tránsito", icon: Truck },
  { key: "out_for_delivery", label: "En reparto", icon: Truck },
  { key: "delivered", label: "Entregado", icon: Home },
];

function progressIndex(status: ShipmentStatus): number {
  switch (status) {
    case "created":
    case "ready_for_pickup":
      return 0;
    case "picked_up":
      return 1;
    case "in_transit":
      return 2;
    case "out_for_delivery":
    case "failed_delivery":
      return 3;
    case "delivered":
      return 4;
    case "returned":
      return 3;
    default:
      return 0;
  }
}

function isFailed(status: ShipmentStatus): boolean {
  return status === "failed_delivery" || status === "returned";
}

// ── Custom Node ──────────────────────────────────────────────────────────

interface StageNodeData {
  label: string;
  icon: typeof PackageIcon;
  state: "done" | "current" | "pending" | "neutral";
  [key: string]: unknown;
}

function StageNode({ data }: NodeProps<Node<StageNodeData>>) {
  const Icon = data.icon;

  const styles = {
    done: {
      ring: "ring-2 ring-primary/30",
      bg: "bg-primary text-primary-foreground",
      label: "text-primary",
    },
    current: {
      ring: "ring-4 ring-primary/40 animate-pulse",
      bg: "bg-primary text-primary-foreground",
      label: "text-primary font-semibold",
    },
    pending: {
      ring: "ring-1 ring-border",
      bg: "bg-muted text-muted-foreground",
      label: "text-muted-foreground",
    },
    // "neutral" se usa cuando el shipment está en failed/returned —
    // todos los nodos se ven uniformes en gris sin destacar ninguno.
    neutral: {
      ring: "ring-1 ring-border",
      bg: "bg-muted text-muted-foreground/60",
      label: "text-muted-foreground/70",
    },
  }[data.state];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full shadow-sm transition-all",
          styles.bg,
          styles.ring,
        )}
      >
        {data.state === "done" ? (
          <Check className="size-5" strokeWidth={2.5} />
        ) : (
          <Icon className="size-4" />
        )}
      </div>
      <span className={cn("text-[10px] leading-none", styles.label)}>
        {data.label}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

// ── Componente principal ─────────────────────────────────────────────────

interface ShipmentRouteMapProps {
  status: ShipmentStatus;
  caption?: string;
  className?: string;
  /** Slot opcional para acciones al lado del banner de fallo (ej "Reintentar"). */
  failureAction?: React.ReactNode;
}

export function ShipmentRouteMap({
  status,
  caption,
  className,
  failureAction,
}: ShipmentRouteMapProps) {
  const progress = progressIndex(status);
  const failed = isFailed(status);

  const { nodes, edges } = useMemo<{
    nodes: Node<StageNodeData>[];
    edges: Edge[];
  }>(() => {
    const NODE_GAP = 110;

    const mainNodes: Node<StageNodeData>[] = STAGES.map((s, i) => {
      let state: StageNodeData["state"];
      if (failed) {
        // Todo gris uniforme cuando el envío fracasó
        state = "neutral";
      } else if (i < progress) {
        state = "done";
      } else if (i === progress && status === s.key) {
        state = "current";
      } else if (i === progress) {
        state = "done";
      } else {
        state = "pending";
      }

      return {
        id: s.key,
        type: "stage",
        position: { x: i * NODE_GAP, y: 0 },
        data: { label: s.label, icon: s.icon, state },
        draggable: false,
        selectable: false,
      };
    });

    const mainEdges: Edge[] = STAGES.slice(0, -1).map((s, i) => {
      const isPast = !failed && i < progress;
      const isCurrentTransition = !failed && i === progress - 1;

      return {
        id: `${s.key}-to-${STAGES[i + 1].key}`,
        source: s.key,
        target: STAGES[i + 1].key,
        animated: isCurrentTransition,
        style: {
          stroke:
            isPast || isCurrentTransition
              ? "var(--primary)"
              : "var(--border)",
          strokeWidth: isPast || isCurrentTransition ? 2 : 1.5,
          strokeDasharray:
            isPast || isCurrentTransition ? undefined : "4 4",
          opacity: failed ? 0.5 : 1,
        },
        type: "smoothstep",
      };
    });

    return { nodes: mainNodes, edges: mainEdges };
  }, [status, progress, failed]);

  const fitViewOptions: ReactFlowProps["fitViewOptions"] = { padding: 0.2 };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      {caption && (
        <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {caption}
        </div>
      )}
      <div className="h-44 sm:h-48">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} className="opacity-30" />
        </ReactFlow>
      </div>

      {/* Banner de fallo debajo */}
      {failed && (
        <div className="flex flex-wrap items-center gap-3 border-t border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            {status === "returned" ? (
              <RefreshCcw className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
          </span>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-semibold text-destructive">
              {status === "returned" ? "Envío devuelto" : "Entrega fallida"}
            </p>
            <p className="text-[11px] text-destructive/80">
              {status === "returned"
                ? "El envío no se pudo entregar tras los intentos y se devolvió."
                : "No se pudo entregar. Podés crear un nuevo envío con los mismos datos para reintentar."}
            </p>
          </div>
          {failureAction && <div className="shrink-0">{failureAction}</div>}
        </div>
      )}
    </div>
  );
}
