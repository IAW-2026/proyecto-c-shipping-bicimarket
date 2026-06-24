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
  Package as PackageIcon,
  RefreshCcw,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS_STYLES } from "@/lib/status-styles";
import type { OrderPickupSummary, ShipmentStatus } from "@/types/shipments";

// ADR-006: diagrama de flujo de un pedido. Un CARRIL por envío (shipment).
//
// Layout (un carril por envío, cada uno con su progreso REAL e independiente):
//
//   Envío 1 · TRK-…   ●──────●──────●──────●   (su propio estado)
//                    Retiro Tráns. Reparto Entreg.
//   Envío 2 · TRK-…   ●──────●──────○──────○
//
// Cada carril se colorea con el estado individual de SU shipment (no con el
// rollup del pedido), así que cuando los envíos divergen (uno entregado, otro
// no) la UI lo muestra honestamente: el pedido no está completo hasta que TODOS
// los carriles lleguen a "Entregado". El caso de un solo envío (vista TRK) es
// simplemente un pedido de 1 carril.

type StageKey = "picked_up" | "in_transit" | "out_for_delivery" | "delivered";

interface StageDef {
  key: StageKey;
  label: string;
  icon: typeof PackageIcon;
}

const STAGES: StageDef[] = [
  { key: "picked_up", label: "Retiro", icon: PackageIcon },
  { key: "in_transit", label: "Tránsito", icon: Truck },
  { key: "out_for_delivery", label: "Reparto", icon: Truck },
  { key: "delivered", label: "Entregado", icon: Home },
];

// Índice del estado individual de un envío dentro de la secuencia de stages.
//   -1 = todavía no retirado (ready_for_pickup / created)
function progressIndex(status: ShipmentStatus): number {
  switch (status) {
    case "created":
    case "ready_for_pickup":
      return -1;
    case "picked_up":
      return 0;
    case "in_transit":
      return 1;
    case "out_for_delivery":
    case "failed_delivery":
    case "returned":
      return 2;
    case "delivered":
      return 3;
    default:
      return -1;
  }
}

function isFailed(status: ShipmentStatus): boolean {
  return status === "failed_delivery" || status === "returned";
}

type StageState = "done" | "current" | "pending" | "failed";

// Estado visual de cada uno de los 4 stages para el status de UN envío.
function stageStatesFor(status: ShipmentStatus): StageState[] {
  const p = progressIndex(status);
  const failed = isFailed(status);
  return STAGES.map((_, j) => {
    if (failed) {
      // Los stages alcanzados quedan "done"; el terminal (Entregado) se marca
      // como "failed" (entrega fallida / devuelto).
      if (j < 3) return "done";
      return "failed";
    }
    if (j <= p) return "done";
    if (j === p + 1) return "current";
    return "pending";
  });
}

// ── Nodes ─────────────────────────────────────────────────────────────────

interface LaneLabelData {
  title: string;
  trackingNumber: string;
  city: string;
  statusLabel: string;
  failed: boolean;
  [key: string]: unknown;
}

interface StageNodeData {
  label: string;
  icon: typeof PackageIcon;
  state: StageState;
  [key: string]: unknown;
}

const STATE_STYLES: Record<
  StageState,
  { ring: string; bg: string; label: string }
> = {
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
  failed: {
    ring: "ring-2 ring-destructive/30",
    bg: "bg-destructive/15 text-destructive",
    label: "text-destructive",
  },
};

function LaneLabelNode({ data }: NodeProps<Node<LaneLabelData>>) {
  return (
    <div className="w-[150px] leading-tight">
      <p className="text-[11px] font-semibold text-foreground">{data.title}</p>
      <p className="truncate font-mono text-[10px] text-muted-foreground">
        {data.trackingNumber}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{data.city}</p>
      <p
        className={cn(
          "mt-0.5 text-[10px] font-medium",
          data.failed ? "text-destructive" : "text-primary",
        )}
      >
        {data.statusLabel}
      </p>
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
          "flex size-9 items-center justify-center rounded-full shadow-sm transition-all",
          styles.bg,
          styles.ring,
        )}
      >
        {data.state === "done" ? (
          <Check className="size-4" strokeWidth={2.5} />
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

const nodeTypes = { laneLabel: LaneLabelNode, stage: StageNode };

// ── Layout constants ──────────────────────────────────────────────────────

const LABEL_X = 0;
const STAGE_X_START = 175;
const STAGE_GAP = 115;
const LANE_GAP = 92;
const STAGE_Y_OFFSET = 4; // centra el círculo respecto del bloque de label

// ── Componente principal ──────────────────────────────────────────────────

interface OrderShipmentFlowProps {
  pickups: OrderPickupSummary[];
  caption?: string;
  className?: string;
  /** Acción opcional para mostrar al pie del banner de fallo. */
  failureAction?: React.ReactNode;
  /** Si está seteado, el carril de ese shipment se destaca con un borde. */
  highlightShipmentId?: string;
}

export function OrderShipmentFlow({
  pickups,
  caption,
  className,
  failureAction,
  highlightShipmentId,
}: OrderShipmentFlowProps) {
  const hasReturned = pickups.some((p) => p.status === "returned");
  const hasFailed = pickups.some((p) => p.status === "failed_delivery");
  const showFailureBanner = hasReturned || hasFailed;
  const deliveredCount = pickups.filter((p) => p.status === "delivered").length;
  // Entrega parcial: algún envío ya entregado + algún otro fallido/devuelto.
  const partial = deliveredCount > 0 && showFailureBanner;

  const { nodes, edges, height } = useMemo<{
    nodes: Node[];
    edges: Edge[];
    height: number;
  }>(() => {
    const n: Node[] = [];
    const e: Edge[] = [];

    pickups.forEach((pickup, laneIdx) => {
      const laneY = laneIdx * LANE_GAP;
      const states = stageStatesFor(pickup.status);
      const failed = isFailed(pickup.status);
      const statusLabel =
        SHIPMENT_STATUS_STYLES[pickup.status]?.label ?? pickup.status;

      // Label del carril (anotación a la izquierda).
      n.push({
        id: `s${pickup.shipment_id}-label`,
        type: "laneLabel",
        position: { x: LABEL_X, y: laneY },
        data: {
          title: `Envío ${laneIdx + 1}`,
          trackingNumber: pickup.tracking_number,
          city: pickup.pickup_city,
          statusLabel,
          failed,
        } satisfies LaneLabelData,
        draggable: false,
        selectable: false,
        ...(pickup.shipment_id === highlightShipmentId && {
          style: {
            outline: "2px dashed var(--primary)",
            borderRadius: 8,
            padding: 4,
          },
        }),
      });

      // 4 stages del carril.
      STAGES.forEach((stage, j) => {
        const state = states[j];
        const icon =
          stage.key === "delivered" && failed
            ? hasReturned && pickup.status === "returned"
              ? RefreshCcw
              : XCircle
            : stage.icon;
        n.push({
          id: `s${pickup.shipment_id}-stage-${stage.key}`,
          type: "stage",
          position: {
            x: STAGE_X_START + j * STAGE_GAP,
            y: laneY + STAGE_Y_OFFSET,
          },
          data: { label: stage.label, icon, state } satisfies StageNodeData,
          draggable: false,
          selectable: false,
        });
      });

      // Edges entre stages del carril.
      STAGES.slice(0, -1).forEach((stage, j) => {
        const from = states[j];
        const to = states[j + 1];
        let stroke = "var(--border)";
        let width = 1.5;
        let dash: string | undefined = "4 4";
        let animated = false;
        if (to === "failed") {
          stroke = "var(--destructive)";
          width = 2;
          dash = undefined;
        } else if (from === "done" && to === "done") {
          stroke = "var(--primary)";
          width = 2;
          dash = undefined;
        } else if (to === "current") {
          stroke = "var(--primary)";
          width = 2;
          dash = undefined;
          animated = true;
        }
        e.push({
          id: `s${pickup.shipment_id}-${stage.key}-${STAGES[j + 1].key}`,
          source: `s${pickup.shipment_id}-stage-${stage.key}`,
          target: `s${pickup.shipment_id}-stage-${STAGES[j + 1].key}`,
          animated,
          style: { stroke, strokeWidth: width, strokeDasharray: dash },
          type: "smoothstep",
        });
      });
    });

    return {
      nodes: n,
      edges: e,
      height: Math.max(150, pickups.length * LANE_GAP + 40),
    };
  }, [pickups, highlightShipmentId, hasReturned]);

  const fitViewOptions: ReactFlowProps["fitViewOptions"] = { padding: 0.15 };

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
      <div style={{ height }} className="min-h-[150px]">
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

      {partial ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Truck className="size-3.5" />
          </span>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Entrega parcial · {deliveredCount}/{pickups.length} entregado
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Parte del pedido se entregó. El resto necesita atención
              (reintentar o devolver) antes de completar el pedido.
            </p>
          </div>
          {failureAction && <div className="shrink-0">{failureAction}</div>}
        </div>
      ) : showFailureBanner ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            {hasReturned ? (
              <RefreshCcw className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
          </span>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-semibold text-destructive">
              {hasReturned ? "Pedido con devolución" : "Entrega fallida"}
            </p>
            <p className="text-[11px] text-destructive/80">
              {hasReturned
                ? "Alguno de los envíos del pedido se devolvió tras no poder entregarse."
                : "Alguno de los envíos del pedido no se pudo entregar. Mirá el detalle de cada envío para reintentar."}
            </p>
          </div>
          {failureAction && <div className="shrink-0">{failureAction}</div>}
        </div>
      ) : null}
    </div>
  );
}
