"use client";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatWeightKg } from "@/lib/format";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";

interface PickupConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  trackingNumber: string;
  weightGrams: number;
  onConfirmed?: () => void;
}

/**
 * Sheet liviano sin evidencia obligatoria. Mockup:
 *   operador-detalle-de-envio/Confirm sheet _ retiro.png
 *
 * Dispara `addTrackingEvent(picked_up)` y cierra.
 */
export function PickupConfirmSheet({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
  weightGrams,
  onConfirmed,
}: PickupConfirmSheetProps) {
  const { addTrackingEvent } = useShipmentMutations(shipmentId);

  function handleConfirm() {
    addTrackingEvent.mutate(
      {
        event_type: "picked_up",
        occurred_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          onConfirmed?.();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>¿Confirmás que retiraste el paquete?</SheetTitle>
          <SheetDescription>
            Esta acción queda registrada en el historial del envío y el
            comprador ve el cambio de estado.
          </SheetDescription>
        </SheetHeader>

        <div className="my-4 space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-mono font-semibold">{trackingNumber}</p>
          <p className="text-xs text-muted-foreground">
            Peso total · {formatWeightKg(weightGrams)}
          </p>
        </div>

        <SheetFooter className="gap-2">
          <Button
            size="lg"
            disabled={addTrackingEvent.isPending}
            onClick={handleConfirm}
          >
            <Check className="size-4" />
            Sí, marcar retirado
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={addTrackingEvent.isPending}
          >
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
