"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OperatorAvatar } from "@/components/operator/OperatorAvatar";
import { VehicleIcon } from "@/components/operator/VehicleIcon";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import { useLogisticsOperators } from "@/hooks/querys/logistics-operators/useLogisticsOperators";
import { useShipmentAdminMutations } from "@/hooks/querys/shipments/useShipmentAdminMutations";
import { cn } from "@/lib/utils";

interface AssignOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  trackingNumber: string;
  /** Cuando hay assignment activo, pasamos el id + nombre del operador actual
   *  para hacer PATCH (reassign) en lugar de POST (assign). */
  currentAssignment?: {
    assignmentId: string;
    operatorName: string;
  };
}

/**
 * Modal de asignación/reasignación. Mockup:
 *   admin-envios/Detalle _ modal reasignar.png
 */
export function AssignOperatorDialog({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
  currentAssignment,
}: AssignOperatorDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedClerkId, setSelectedClerkId] = useState<string | null>(null);

  const { data, isLoading } = useLogisticsOperators(1, 100, {
    status: ["active"],
  });
  const { assignOperator, reassignOperator } =
    useShipmentAdminMutations(shipmentId);

  const operators = data?.data ?? [];
  const filtered = useMemo(() => {
    if (!search) return operators;
    const q = search.toLowerCase();
    return operators.filter(
      (o) =>
        o.full_name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.clerk_user_id.toLowerCase().includes(q),
    );
  }, [operators, search]);

  const selected = operators.find((o) => o.clerk_user_id === selectedClerkId);

  const isPending = assignOperator.isPending || reassignOperator.isPending;

  function handleConfirm() {
    if (!selected) return;

    const onSuccess = () => {
      setSelectedClerkId(null);
      setSearch("");
      onOpenChange(false);
    };

    if (currentAssignment) {
      reassignOperator.mutate(
        {
          assignmentId: currentAssignment.assignmentId,
          data: { operator_clerk_user_id: selected.clerk_user_id },
        },
        { onSuccess },
      );
    } else {
      assignOperator.mutate(
        { operator_clerk_user_id: selected.clerk_user_id },
        { onSuccess },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar envío a operador</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {trackingNumber}
          </DialogDescription>
        </DialogHeader>

        {currentAssignment && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              El operador actual{" "}
              <span className="font-semibold">
                {currentAssignment.operatorName}
              </span>{" "}
              será reemplazado. El cambio queda registrado en el audit.
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="-mx-1 max-h-72 overflow-y-auto px-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay operadores activos
              {search ? ` que coincidan con "${search}"` : ""}.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((op) => {
                const isSelected = selectedClerkId === op.clerk_user_id;
                return (
                  <li key={op.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedClerkId(op.clerk_user_id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <OperatorAvatar
                        name={op.full_name}
                        status={op.status}
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{op.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          <VehicleIcon
                            vehicle={op.vehicle_type}
                            className="mr-1"
                          />
                          {VEHICLE_LABELS[op.vehicle_type]} ·{" "}
                          {op.license_plate}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="size-4 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            disabled={!selected || isPending}
            onClick={handleConfirm}
          >
            {selected
              ? `Asignar a ${selected.full_name.split(" ")[0]}`
              : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
