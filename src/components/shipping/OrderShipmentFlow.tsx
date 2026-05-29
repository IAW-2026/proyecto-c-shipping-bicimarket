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
import { rollupShipmentStatus } from "@/lib/shipment-rollup";
import type { OrderPickupSummary, ShipmentStatus } from "@/types/shipments";

// ADR-005: diagrama de flujo de un pedido multi-vendedor.
//
// Layout:
//   [pickup A] ─┐
//   [pickup B] ─┼─→ [retirado] ─→ [tránsito] ─→ [reparto] ─→ [entregado]
//   [pickup C] ─┘
//
// Cada pickup_i refleja el estado individual de su shipment:
//   - state=current   → ready_for_pickup (parpadea)
//   - state=done      → picked_up o más adelante
// El nodo "retirado" se ilumina solo cuando TODOS los pickups están done.
// Después del retirado, el flujo es consolidado: se usa el rollup_status
// del pedido para colorear in_transit / out_for_delivery / delivered.

type StageKey =
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

interface StageDef {
  key: StageKey;
  label: string;
  icon: typeof PackageIcon;
}

const CONSOLIDATED_STAGES: StageDef[] = [
  { key: "picked_up", label: "Retirado", icon: PackageIcon },
  { key: "in_transit", label: "En tránsito", icon: Truck },
  { key: "out_for_delivery", label: "En reparto", icon: Truck },
  { key: "delivered", label: "Entregado", icon: Home },
];

function progressIndex(status: ShipmentStatus): number {
  switch (status) {
    case "created":
    case "ready_for_pickup":
      return -1; // antes de consolidar
    case "picked_up":
      return 0;
    case "in_transit":
      return 1;
    case "out_for_delivery":
    case "failed_delivery":
      return 2;
    case "delivered":
      return 3;
    case "returned":
      return 2;
    default:
      return -1;
  }
}

function isFailed(status: ShipmentStatus): boolean {
  return status === "failed_delivery" || status === "returned";
}

function isPickedUpOrBeyond(status: ShipmentStatus): boolean {
  return (
    status === "picked_up" ||
    status === "in_transit" ||
    status === "out_for_delivery" ||
    status === "delivered" ||
    status === "failed_delivery" ||
    status === "returned"
  );
}

// ── Nodes ─────────────────────────────────────────────────────────────────

interface PickupNodeData {
  label: string;
  trackingNumber: string;
  state: "done" | "current" | "pending" | "neutral";
  [key: string]: unknown;
}

interface StageNodeData {
  label: string;
  icon: typeof PackageIcon;
  state: "done" | "current" | "pending" | "neutral";
  [key: string]: unknown;
}

const STATE_STYLES = {
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
  neutral: {
    ring: "ring-1 ring-border",
    bg: "bg-muted text-muted-foreground/60",
    label: "text-muted-foreground/70",
  },
} as const;

function PickupNode({ data }: NodeProps<Node<PickupNodeData>>) {
  const styles = STATE_STYLES[data.state];
  return (
    <div className="flex max-w-[140px] flex-col items-center gap-1">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full shadow-sm transition-all",
          styles.bg,
          styles.ring,
        )}
      >
        {data.state === "done" ? (
          <Check className="size-4" strokeWidth={2.5} />
        ) : (
          <MapPin className="size-4" />
        )}
      </div>
      <div className="text-center leading-tight">
        <p className={cn("text-[10px] font-medium", styles.label)}>
          {data.label}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground">
          {data.trackingNumber}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
    </div>
  );
}

function StageNode({ data }: NodeProps<Node<StageNodeData>>) {
  const Icon = data.icon;
  const styles = STATE_STYLES[data.state];
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

const nodeTypes = { pickup: PickupNode, stage: StageNode };

// ── Layout constants ──────────────────────────────────────────────────────

const PICKUP_X = 0;
const STAGE_X_START = 200;
const STAGE_GAP = 130;
const PICKUP_Y_GAP = 70;

// ── Componente principal ──────────────────────────────────────────────────

interface OrderShipmentFlowProps {
  pickups: OrderPickupSummary[];
  caption?: string;
  className?: string;
  /** Acción opcional para mostrar al pie del banner de fallo. */
  failureAction?: React.ReactNode;
  /** Si está seteado, el pickup del shipmentId actual se destaca con border. */
  highlightShipmentId?: string;
}

export function OrderShipmentFlow({
  pickups,
  caption,
  className,
  failureAction,
  highlightShipmentId,
}: OrderShipmentFlowProps) {
  const rollup = useMemo(
    () => rollupShipmentStatus(pickups.map((p) => p.status)),
    [pickups],
  );
  const failed = isFailed(rollup);
  const consolidatedProgress = progressIndex(rollup);

  const { nodes, edges, height } = useMemo<{
    nodes: Node[];
    edges: Edge[];
    height: number;
  }>(() => {
    const n: Node[] = [];
    const e: Edge[] = [];

    // Vertical center for stages relative to the vertical stack of pickups.
    const pickupCount = pickups.length;
    const totalPickupH = Math.max(1, pickupCount - 1) * PICKUP_Y_GAP;
    const centerY = totalPickupH / 2;

    // Pickup nodes
    pickups.forEach((pickup, i) => {
      let state: PickupNodeData["state"];
      if (failed) {
        state = "neutral";
      } else if (isPickedUpOrBeyond(pickup.status)) {
        state = "done";
      } else if (pickup.status === "ready_for_pickup") {
        state = "current";
      } else {
        state = "pending";
      }

      n.push({
        id: `pickup-${pickup.shipment_id}`,
        type: "pickup",
        position: { x: PICKUP_X, y: i * PICKUP_Y_GAP },
        data: {
          label: pickup.pickup_city,
          trackingNumber: pickup.tracking_number,
          state,
        } satisfies PickupNodeData,
        draggable: false,
        selectable: false,
        // outline para destacar el pickup actual
        ...(pickup.shipment_id === highlightShipmentId && {
          style: { outline: "2px dashed var(--primary)", borderRadius: 12 },
        }),
      });
    });

    // Consolidated stages
    CONSOLIDATED_STAGES.forEach((stage, i) => {
      let state: StageNodeData["state"];
      if (failed) {
        state = "neutral";
      } else if (i < consolidatedProgress) {
        state = "done";
      } else if (i === consolidatedProgress) {
        state = "done";
      } else if (i === consolidatedProgress + 1) {
        state = "pending";
      } else {
        state = "pending";
      }
      // Estado "current" → marcamos el que coincide con el rollup
      if (!failed && stage.key === rollup) {
        state = consolidatedProgress === 0 && pickupCount > 1 ? "done" : "current";
      }

      n.push({
        id: `stage-${stage.key}`,
        type: "stage",
        position: { x: STAGE_X_START + i * STAGE_GAP, y: centerY },
        data: { label: stage.label, icon: stage.icon, state } satisfies StageNodeData,
        draggable: false,
        selectable: false,
      });
    });

    // Edges: cada pickup → "picked_up". Done si su shipment está picked_up o más.
    pickups.forEach((pickup) => {
      const isPickupDone = !failed && isPickedUpOrBeyond(pickup.status);
      e.push({
        id: `pickup-${pickup.shipment_id}-to-picked_up`,
        source: `pickup-${pickup.shipment_id}`,
        target: "stage-picked_up",
        animated: !failed && pickup.status === "ready_for_pickup",
        style: {
          stroke: isPickupDone ? "var(--primary)" : "var(--border)",
          strokeWidth: isPickupDone ? 2 : 1.5,
          strokeDasharray: isPickupDone ? undefined : "4 4",
          opacity: failed ? 0.5 : 1,
        },
        type: "smoothstep",
      });
    });

    // Edges entre stages consolidadas
    CONSOLIDATED_STAGES.slice(0, -1).forEach((stage, i) => {
      const isPast = !failed && i < consolidatedProgress;
      const isCurrentTransition = !failed && i === consolidatedProgress;
      e.push({
        id: `${stage.key}-to-${CONSOLIDATED_STAGES[i + 1].key}`,
        source: `stage-${stage.key}`,
        target: `stage-${CONSOLIDATED_STAGES[i + 1].key}`,
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
      });
    });

    return { nodes: n, edges: e, height: Math.max(180, totalPickupH + 100) };
  }, [pickups, failed, consolidatedProgress, rollup, highlightShipmentId]);

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
      <div style={{ height }} className="min-h-[180px]">
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

      {failed && (
        <div className="flex flex-wrap items-center gap-3 border-t border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            {rollup === "returned" ? (
              <RefreshCcw className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
          </span>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-semibold text-destructive">
              {rollup === "returned" ? "Pedido devuelto" : "Entrega fallida"}
            </p>
            <p className="text-[11px] text-destructive/80">
              {rollup === "returned"
                ? "Alguno de los envíos del pedido se devolvió tras no poder entregarse."
                : "Alguno de los envíos del pedido no se pudo entregar. Mirá el detalle de cada pickup para reintentar."}
            </p>
          </div>
          {failureAction && <div className="shrink-0">{failureAction}</div>}
        </div>
      )}
    </div>
  );
}
