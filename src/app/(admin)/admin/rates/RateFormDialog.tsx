"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useShippingRateMutations } from "@/hooks/querys/shipping-rates/useShippingRateMutations";
import type {
  CreateShippingRateBody,
  ShippingRateDTO,
} from "@/types/shipping-rates";
import type { ServiceLevel } from "@/types/shipments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ShippingRateDTO | null;
}

const SERVICE_LEVELS: ServiceLevel[] = ["standard", "express", "same_day"];
const SERVICE_LABELS: Record<ServiceLevel, string> = {
  standard: "Estándar",
  express: "Express",
  same_day: "Mismo día",
};

const CARRIERS = ["andreani", "oca", "propio"];

interface FormState {
  carrier: string;
  service_level: ServiceLevel;
  distance_km_min: string;
  distance_km_max: string;
  weight_grams_min: string;
  weight_grams_max: string;
  cost_pesos: string; // input en pesos, lo convertimos a cents
  estimated_days_min: string;
  estimated_days_max: string;
  active: boolean;
}

const EMPTY: FormState = {
  carrier: "andreani",
  service_level: "standard",
  distance_km_min: "0",
  distance_km_max: "10",
  weight_grams_min: "0",
  weight_grams_max: "2000",
  cost_pesos: "2500",
  estimated_days_min: "3",
  estimated_days_max: "5",
  active: true,
};

export function RateFormDialog({ open, onOpenChange, editing }: Props) {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { createRate, patchRate } = useShippingRateMutations();
  const isPending = createRate.isPending || patchRate.isPending;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setValues({
        carrier: editing.carrier,
        service_level: editing.service_level,
        distance_km_min: String(editing.distance_km_min),
        distance_km_max: String(editing.distance_km_max),
        weight_grams_min: String(editing.weight_grams_min),
        weight_grams_max: String(editing.weight_grams_max),
        cost_pesos: String(editing.cost_cents / 100),
        estimated_days_min: String(editing.estimated_days_min),
        estimated_days_max: String(editing.estimated_days_max),
        active: editing.active,
      });
    } else {
      setValues(EMPTY);
    }
    setError(null);
  }, [open, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: CreateShippingRateBody = {
      carrier: values.carrier.trim(),
      service_level: values.service_level,
      distance_km_min: parseInt(values.distance_km_min, 10),
      distance_km_max: parseInt(values.distance_km_max, 10),
      weight_grams_min: parseInt(values.weight_grams_min, 10),
      weight_grams_max: parseInt(values.weight_grams_max, 10),
      cost_cents: Math.round(parseFloat(values.cost_pesos) * 100),
      estimated_days_min: parseInt(values.estimated_days_min, 10),
      estimated_days_max: parseInt(values.estimated_days_max, 10),
      active: values.active,
    };

    // Validación rápida client-side; el server vuelve a validar.
    if (Number.isNaN(body.distance_km_min) || Number.isNaN(body.distance_km_max)) {
      setError("Distancia inválida");
      return;
    }
    if (body.distance_km_max <= body.distance_km_min) {
      setError("La distancia máxima debe ser mayor a la mínima");
      return;
    }
    if (Number.isNaN(body.weight_grams_min) || Number.isNaN(body.weight_grams_max)) {
      setError("Peso inválido");
      return;
    }
    if (body.weight_grams_max <= body.weight_grams_min) {
      setError("El peso máximo debe ser mayor al mínimo");
      return;
    }
    if (Number.isNaN(body.cost_cents) || body.cost_cents < 0) {
      setError("Costo inválido");
      return;
    }
    if (body.estimated_days_max < body.estimated_days_min) {
      setError("Los días máx deben ser >= mín");
      return;
    }

    const onSuccess = () => {
      onOpenChange(false);
    };

    if (editing) {
      patchRate.mutate({ rateId: editing.id, data: body }, { onSuccess });
    } else {
      createRate.mutate(body, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar tarifa" : "Nueva tarifa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Carrier" required>
              <Select
                value={values.carrier}
                onValueChange={(v) => v && set("carrier", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Service level" required>
              <Select
                value={values.service_level}
                onValueChange={(v) =>
                  v && set("service_level", v as ServiceLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_LEVELS.map((sl) => (
                    <SelectItem key={sl} value={sl}>
                      {SERVICE_LABELS[sl]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Distancia mínima (km)"
              required
              helper="Ej: 0, 10, 50, 150, 500"
            >
              <Input
                type="number"
                value={values.distance_km_min}
                onChange={(e) => set("distance_km_min", e.target.value)}
                min={0}
                placeholder="0"
              />
            </Field>

            <Field
              label="Distancia máxima (km)"
              required
              helper="Usá 999999 para 'sin tope'"
            >
              <Input
                type="number"
                value={values.distance_km_max}
                onChange={(e) => set("distance_km_max", e.target.value)}
                min={1}
                placeholder="10"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso mínimo (gramos)" required>
              <Input
                type="number"
                value={values.weight_grams_min}
                onChange={(e) => set("weight_grams_min", e.target.value)}
                min={0}
              />
            </Field>
            <Field label="Peso máximo (gramos)" required>
              <Input
                type="number"
                value={values.weight_grams_max}
                onChange={(e) => set("weight_grams_max", e.target.value)}
                min={1}
              />
            </Field>
          </div>

          <Field label="Costo en pesos" required helper="Se guarda en centavos">
            <Input
              type="number"
              step="0.01"
              value={values.cost_pesos}
              onChange={(e) => set("cost_pesos", e.target.value)}
              min={0}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Días mín" required>
              <Input
                type="number"
                value={values.estimated_days_min}
                onChange={(e) => set("estimated_days_min", e.target.value)}
                min={0}
              />
            </Field>
            <Field label="Días máx" required>
              <Input
                type="number"
                value={values.estimated_days_max}
                onChange={(e) => set("estimated_days_max", e.target.value)}
                min={0}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch
              checked={values.active}
              onCheckedChange={(v) => set("active", v)}
            />
            <div className="leading-tight">
              <p className="text-sm font-medium">Activa</p>
              <p className="text-xs text-muted-foreground">
                Si está apagada, el motor de cotizaciones la ignora.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear tarifa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
