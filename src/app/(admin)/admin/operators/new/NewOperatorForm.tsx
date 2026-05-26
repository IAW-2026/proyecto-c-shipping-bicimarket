"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import { VehicleIcon } from "@/components/operator/VehicleIcon";
import { useLogisticsOperatorMutations } from "@/hooks/querys/logistics-operators/useLogisticsOperatorMutations";
import { createLogisticsOperatorSchema } from "@/validation/logistics-operators";
import type { CreateLogisticsOperatorBody, VehicleType } from "@/types/logistics-operators";

type FieldKey = keyof CreateLogisticsOperatorBody;
type FieldErrors = Partial<Record<FieldKey, string>>;

const INITIAL: CreateLogisticsOperatorBody = {
  clerk_user_id: "",
  full_name: "",
  email: "",
  phone: "",
  document_id: "",
  vehicle_type: "van",
  license_plate: "",
};

const VEHICLES: VehicleType[] = ["motorcycle", "car", "van", "truck"];

export function NewOperatorForm() {
  const router = useRouter();
  const [values, setValues] = useState<CreateLogisticsOperatorBody>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { createOperator } = useLogisticsOperatorMutations();

  function setField<K extends FieldKey>(
    key: K,
    value: CreateLogisticsOperatorBody[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createLogisticsOperatorSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as FieldKey | undefined;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    createOperator.mutate(parsed.data, {
      onSuccess: (created) => {
        router.push(`/admin/operators/${created.id}`);
      },
      onError: (err) => {
        // Si el backend devuelve un código específico, mapeamos al campo
        const code = err.response?.data?.error?.code;
        if (code === "CONFLICT") {
          setErrors((e) => ({
            ...e,
            clerk_user_id: "Ya existe un operador con ese Clerk User ID.",
          }));
        }
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-card p-6"
    >
      <Field
        label="Clerk User ID"
        required
        error={errors.clerk_user_id}
        helper="Lo copiás del Clerk Dashboard después de invitar al operador. Empieza con user_…"
      >
        <Input
          value={values.clerk_user_id}
          onChange={(e) => setField("clerk_user_id", e.target.value)}
          placeholder="user_2nKxYz7vQp..."
          className="font-mono"
          aria-invalid={!!errors.clerk_user_id}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre completo"
          required
          error={errors.full_name}
        >
          <Input
            value={values.full_name}
            onChange={(e) => setField("full_name", e.target.value)}
            placeholder="Juan Pérez"
            aria-invalid={!!errors.full_name}
          />
        </Field>

        <Field
          label="Email"
          required
          error={errors.email}
          helper="Para notificaciones internas"
        >
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="juan@logistica.bicimarket.com"
              className="pl-8"
              aria-invalid={!!errors.email}
            />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" required error={errors.phone}>
          <Input
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+54 9 11 3333 4444"
            aria-invalid={!!errors.phone}
          />
        </Field>

        <Field
          label="DNI / Documento"
          required
          error={errors.document_id}
          helper="Solo números, sin puntos"
        >
          <Input
            inputMode="numeric"
            value={values.document_id}
            onChange={(e) =>
              setField("document_id", e.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="30123456"
            aria-invalid={!!errors.document_id}
          />
        </Field>
      </div>

      <Field
        label="Tipo de vehículo"
        required
        error={errors.vehicle_type}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VEHICLES.map((v) => {
            const selected = values.vehicle_type === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setField("vehicle_type", v)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <VehicleIcon vehicle={v} />
                {VEHICLE_LABELS[v]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Patente"
        required
        error={errors.license_plate}
        helper="Mayúsculas y sin espacios"
      >
        <Input
          value={values.license_plate}
          onChange={(e) =>
            setField("license_plate", e.target.value.toUpperCase().replace(/\s/g, ""))
          }
          placeholder="AB123CD"
          className="font-mono"
          aria-invalid={!!errors.license_plate}
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/operators")}
          disabled={createOperator.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createOperator.isPending}>
          {createOperator.isPending ? "Creando…" : "Crear operador"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
