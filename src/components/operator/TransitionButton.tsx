"use client";
import { useState } from "react";
import { ArrowRight, Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPERATOR_TRANSITIONS } from "@/lib/status-styles";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";
import { PickupConfirmSheet } from "./PickupConfirmSheet";
import { DeliveryConfirmSheet } from "./DeliveryConfirmSheet";
import type { ShipmentStatus } from "@/types/shipments";

interface TransitionButtonProps {
  shipmentId: string;
  trackingNumber: string;
  weightGrams: number;
  status: ShipmentStatus;
  /** Tamaño del botón. "default" para cards de lista, "lg" para sticky bottom. */
  size?: "default" | "lg";
  /** Si true, el botón se renderiza full-width (default para sticky/cards). */
  fullWidth?: boolean;
  /** Si true, deshabilita el botón (ej. operador suspended). */
  disabled?: boolean;
  className?: string;
}

/**
 * Botón que materializa la transición operativa siguiente. La label, el
 * ícono y el efecto cambian segun el status actual del shipment. Centraliza
 * la lógica para que tanto la card del listado como el sticky del detalle
 * usen el mismo componente.
 */
export function TransitionButton({
  shipmentId,
  trackingNumber,
  weightGrams,
  status,
  size = "default",
  fullWidth = true,
  disabled = false,
  className,
}: TransitionButtonProps) {
  const [pickupOpen, setPickupOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);

  const { addTrackingEvent } = useShipmentMutations(shipmentId);
  const transition = OPERATOR_TRANSITIONS[status];

  if (transition.action === "none") return null;

  const Icon =
    transition.action === "open-deliver-sheet"
      ? Camera
      : transition.action === "open-pickup-sheet"
        ? Check
        : ArrowRight;

  function handleClick(e: React.MouseEvent) {
    // Evita que el click navegue al detalle si el botón vive dentro de una Link card
    e.preventDefault();
    e.stopPropagation();

    switch (transition.action) {
      case "open-pickup-sheet":
        setPickupOpen(true);
        return;
      case "open-deliver-sheet":
        setDeliverOpen(true);
        return;
      case "mutate-in-transit":
        addTrackingEvent.mutate({
          event_type: "in_transit",
          occurred_at: new Date().toISOString(),
        });
        return;
      case "mutate-out-for-delivery":
        addTrackingEvent.mutate({
          event_type: "out_for_delivery",
          occurred_at: new Date().toISOString(),
        });
        return;
    }
  }

  return (
    <>
      <Button
        size={size}
        onClick={handleClick}
        disabled={disabled || addTrackingEvent.isPending}
        className={`${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      >
        <Icon className="size-4" />
        {transition.label}
      </Button>

      <PickupConfirmSheet
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        shipmentId={shipmentId}
        trackingNumber={trackingNumber}
        weightGrams={weightGrams}
      />

      <DeliveryConfirmSheet
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        shipmentId={shipmentId}
        trackingNumber={trackingNumber}
      />
    </>
  );
}
