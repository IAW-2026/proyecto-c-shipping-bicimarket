"use client";
import { useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useShippingRates } from "@/hooks/querys/shipping-rates/useShippingRates";
import { useShippingRateMutations } from "@/hooks/querys/shipping-rates/useShippingRateMutations";
import { formatArs, formatWeightKg } from "@/lib/format";
import { Scale } from "lucide-react";
import { RateFormDialog } from "./RateFormDialog";
import type { ShippingRateDTO } from "@/types/shipping-rates";

export function RatesTable() {
  const { data, isLoading, isError, refetch } = useShippingRates();
  const { patchRate, deleteRate } = useShippingRateMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRateDTO | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ShippingRateDTO | null>(
    null,
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rate: ShippingRateDTO) {
    setEditing(rate);
    setFormOpen(true);
  }

  function toggleActive(rate: ShippingRateDTO, next: boolean) {
    patchRate.mutate({ rateId: rate.id, data: { active: next } });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    deleteRate.mutate(confirmDelete.id, {
      onSuccess: () => setConfirmDelete(null),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        title="No pudimos cargar las tarifas"
        onRetry={() => refetch()}
      />
    );
  }

  const rates = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rates.length}{" "}
          {rates.length === 1 ? "tarifa configurada" : "tarifas configuradas"}
          {" · "}
          <span className="text-primary">
            {rates.filter((r) => r.active).length} activas
          </span>
        </p>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Nueva tarifa
        </Button>
      </div>

      {rates.length === 0 ? (
        <EmptyState
          icon={Scale}
          variant="primary"
          title="Sin tarifas todavía"
          subtitle="Sin tarifas configuradas, el motor de cotizaciones no puede calcular precios."
          cta={{ label: "+ Nueva tarifa", onClick: openNew }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Distancia</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id} className={!r.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{r.carrier}</TableCell>
                  <TableCell>
                    <StatusBadge
                      kind="service-level"
                      status={r.service_level}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.distance_km_max >= 999_999
                      ? `${r.distance_km_min}+ km`
                      : `${r.distance_km_min}–${r.distance_km_max} km`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatWeightKg(r.weight_grams_min)} –{" "}
                    {formatWeightKg(r.weight_grams_max)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatArs(r.cost_cents)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.estimated_days_min === r.estimated_days_max
                      ? `${r.estimated_days_min}d`
                      : `${r.estimated_days_min}–${r.estimated_days_max}d`}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) => toggleActive(r, v)}
                      disabled={patchRate.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreVertical className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          <Pencil className="size-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmDelete(r)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-3.5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarifa</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra definitivamente. Si querés solo desactivarla, usá el
              switch &quot;Activa&quot; — los pedidos viejos no se ven afectados
              porque guardan snapshot del costo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteRate.isPending}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
