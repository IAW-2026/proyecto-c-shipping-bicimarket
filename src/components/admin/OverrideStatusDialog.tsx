"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIPMENT_STATUS_STYLES } from "@/lib/status-styles";
import { useShipmentAdminMutations } from "@/hooks/querys/shipments/useShipmentAdminMutations";
import type { ShipmentStatus } from "@/types/shipments";

interface OverrideStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  trackingNumber: string;
  currentStatus: ShipmentStatus;
}

const ALL_STATUSES: ShipmentStatus[] = [
  "created",
  "ready_for_pickup",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed_delivery",
  "returned",
];

/**
 * Dialog para que el admin force un cambio de status sin pasar por la
 * máquina de estados. Acompaña con nota obligatoria para auditoría.
 */
export function OverrideStatusDialog({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
  currentStatus,
}: OverrideStatusDialogProps) {
  const [next, setNext] = useState<ShipmentStatus>(currentStatus);
  const [note, setNote] = useState("");
  const { overrideStatus } = useShipmentAdminMutations(shipmentId);

  function handleConfirm() {
    if (next === currentStatus) {
      onOpenChange(false);
      return;
    }
    overrideStatus.mutate(
      { status: next, note: note || undefined },
      {
        onSuccess: () => {
          setNote("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override de estado</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {trackingNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Esto fuerza el cambio sin validar la máquina de estados normal.
            Usalo solo para correcciones puntuales.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="next-status" className="text-sm">
            Nuevo estado
          </Label>
          <Select
            value={next}
            onValueChange={(v) => setNext(v as ShipmentStatus)}
          >
            <SelectTrigger id="next-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SHIPMENT_STATUS_STYLES[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="override-note" className="text-sm">
            Nota (queda en el audit history)
          </Label>
          <Textarea
            id="override-note"
            placeholder="Ej: Corrección manual tras reclamo del comprador #1234"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={overrideStatus.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={next === currentStatus || overrideStatus.isPending}
            onClick={handleConfirm}
          >
            Forzar override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
