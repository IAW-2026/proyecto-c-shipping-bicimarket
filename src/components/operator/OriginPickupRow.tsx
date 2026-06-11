"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Boxes,
  Package,
  RotateCcw,
  Send,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Spinner } from "@/components/ui/spinner";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";
import { formatWeightKg } from "@/lib/format";
import { PickupConfirmSheet } from "./PickupConfirmSheet";
import { DeliveryConfirmSheet } from "./DeliveryConfirmSheet";
import type { AssignmentDTO } from "@/types/assignments";

interface OriginPickupRowProps {
  assignment: AssignmentDTO;
  disabled?: boolean;
}

/**
 * Fila compacta dentro de OrderPickupCard. Una por shipment del order_id.
 * El cuerpo (dirección + tracking) navega al detalle del shipment individual
 * `/dashboard/shipments/{id}` para que el operador pueda ver el timeline, los
 * paquetes, etc. La acción contextual vive en el lado derecho y depende del
 * estado:
 * Cada envío se opera de forma INDEPENDIENTE desde su fila (ADR-006): si un
 * envío del pedido falla, el operador puede seguir avanzando los demás sin
 * quedar trabado.
 *   - ready_for_pickup → "Retirar" (abre PickupConfirmSheet)
 *   - picked_up        → "En tránsito" (avance directo)
 *   - in_transit       → "En reparto" (avance directo)
 *   - out_for_delivery → "Entregar" (abre DeliveryConfirmSheet — cada
 *     shipment necesita su propio proof, ADR-005 sprint 1)
 *   - failed_delivery  → "Reintentar" (vuelve a in_transit)
 *   - delivered / returned → status pill + link al detalle
 */
export function OriginPickupRow({
  assignment,
  disabled = false,
}: OriginPickupRowProps) {
  const [pickupOpen, setPickupOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const address = assignment.pickup_address;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 p-3">
        <Link
          href={`/dashboard/shipments/${assignment.id}`}
          className="min-w-0 flex-1 space-y-1 hover:opacity-80"
        >
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-xs font-semibold text-foreground">
              {assignment.tracking_number}
            </p>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              pickup
            </span>
          </div>
          <p className="truncate text-sm text-foreground">
            {address.street} {address.number}
            {address.apartment ? ` · ${address.apartment}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {address.city}, {address.province} · {address.postal_code}
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Package className="size-3" />
              {formatWeightKg(assignment.weight_grams_total)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Boxes className="size-3" />
              {assignment.packages_count}{" "}
              {assignment.packages_count === 1 ? "bulto" : "bultos"}
            </span>
            <span className="ml-auto inline-flex items-center gap-0.5 text-primary">
              Ver detalle <ChevronRight className="size-3" />
            </span>
          </div>
        </Link>

        <div
          className="flex shrink-0 flex-col items-end gap-1"
          onClick={stop}
        >
          <RowAction
            assignment={assignment}
            disabled={disabled}
            onOpenPickup={() => setPickupOpen(true)}
            onOpenDeliver={() => setDeliverOpen(true)}
          />
        </div>
      </div>

      <PickupConfirmSheet
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        shipmentId={assignment.id}
        trackingNumber={assignment.tracking_number}
        weightGrams={assignment.weight_grams_total}
      />
      <DeliveryConfirmSheet
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        shipmentId={assignment.id}
        trackingNumber={assignment.tracking_number}
      />
    </li>
  );
}

function RowAction({
  assignment,
  disabled,
  onOpenPickup,
  onOpenDeliver,
}: {
  assignment: AssignmentDTO;
  disabled: boolean;
  onOpenPickup: () => void;
  onOpenDeliver: () => void;
}) {
  const { addTrackingEvent, retry } = useShipmentMutations(assignment.id);
  const busy = addTrackingEvent.isPending || retry.isPending;
  const off = disabled || busy;

  // Avance directo (sin proof) para las transiciones intermedias.
  function advance(event_type: "in_transit" | "out_for_delivery") {
    addTrackingEvent.mutate({
      event_type,
      occurred_at: new Date().toISOString(),
    });
  }

  switch (assignment.status) {
    case "ready_for_pickup":
      return (
        <Button size="sm" disabled={off} onClick={onOpenPickup}>
          <Check className="size-4" />
          Retirar
        </Button>
      );
    case "picked_up":
      return (
        <Button size="sm" disabled={off} onClick={() => advance("in_transit")}>
          {addTrackingEvent.isPending ? <Spinner /> : <Truck className="size-4" />}
          En tránsito
        </Button>
      );
    case "in_transit":
      return (
        <Button
          size="sm"
          disabled={off}
          onClick={() => advance("out_for_delivery")}
        >
          {addTrackingEvent.isPending ? <Spinner /> : <Send className="size-4" />}
          En reparto
        </Button>
      );
    case "out_for_delivery":
      return (
        <Button size="sm" disabled={off} onClick={onOpenDeliver}>
          <Camera className="size-4" />
          Entregar
        </Button>
      );
    case "failed_delivery":
      return (
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={assignment.status} size="sm" />
          <Button
            size="sm"
            variant="outline"
            disabled={off}
            onClick={() => retry.mutate(undefined)}
          >
            {retry.isPending ? <Spinner /> : <RotateCcw className="size-4" />}
            Reintentar
          </Button>
        </div>
      );
    case "delivered":
    case "returned":
    case "created":
    default:
      return <StatusBadge status={assignment.status} size="sm" />;
  }
}
