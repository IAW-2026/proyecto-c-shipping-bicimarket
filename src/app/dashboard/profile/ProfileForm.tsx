"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { ChevronLeft, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { VehicleIcon } from "@/components/operator/VehicleIcon";
import { OperatorStatusBanner } from "@/components/operator/OperatorStatusBanner";
import { useMyOperator } from "@/hooks/querys/my-operator/useMyOperator";
import { useMyOperatorMutations } from "@/hooks/querys/my-operator/useMyOperatorMutations";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import type { VehicleType } from "@/types/logistics-operators";

const VEHICLES: VehicleType[] = ["motorcycle", "car", "van", "truck"];

interface FormState {
  phone: string;
  document_id: string;
  vehicle_type: VehicleType;
  license_plate: string;
}

const EMPTY: FormState = {
  phone: "",
  document_id: "",
  vehicle_type: "van",
  license_plate: "",
};

export function ProfileForm() {
  const { data: operator, isLoading, isError, refetch } = useMyOperator();
  const { patchMyOperator } = useMyOperatorMutations();

  const [values, setValues] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operator) return;
    setValues({
      phone: operator.phone,
      document_id: operator.document_id,
      vehicle_type: operator.vehicle_type,
      license_plate: operator.license_plate,
    });
  }, [operator]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.phone.trim()) return setError("Teléfono requerido");
    if (!/^\d+$/.test(values.document_id))
      return setError("DNI: solo números, sin puntos");
    if (!/^[A-Z0-9]+$/.test(values.license_plate))
      return setError("Patente: solo letras y números, sin espacios");

    patchMyOperator.mutate({
      phone: values.phone.trim(),
      document_id: values.document_id.trim(),
      vehicle_type: values.vehicle_type,
      license_plate: values.license_plate.trim().toUpperCase(),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !operator) {
    return (
      <div className="space-y-4">
        <ErrorBanner
          title="No pudimos cargar tus datos"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/assignments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">Mi perfil</h1>
        <p className="text-xs text-muted-foreground">
          Actualizá tus datos de contacto y vehículo. Tu nombre y email los
          administra Clerk.
        </p>
      </div>

      <OperatorStatusBanner status={operator.status} />

      {/* Bloque de Clerk (identidad) — nombre/email read-only + UserButton
          para gestionar la cuenta de Clerk (cambiar foto, password, logout). */}
      <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock className="size-3" />
            Cuenta de Clerk
          </div>
          <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Nombre
            </dt>
            <dd className="font-medium">{operator.full_name}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Email
            </dt>
            <dd className="font-medium">{operator.email}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-muted-foreground">
          Para cambiar nombre, email, foto o cerrar sesión, abrí el avatar de
          Clerk arriba.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <Field label="Teléfono" required>
          <Input
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+54 9 11 3333 4444"
            inputMode="tel"
          />
        </Field>

        <Field label="DNI / Documento" required helper="Solo números">
          <Input
            value={values.document_id}
            onChange={(e) =>
              set("document_id", e.target.value.replace(/[^\d]/g, ""))
            }
            inputMode="numeric"
            placeholder="30123456"
          />
        </Field>

        <Field label="Tipo de vehículo" required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VEHICLES.map((v) => {
              const selected = values.vehicle_type === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("vehicle_type", v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors",
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

        <Field label="Patente" required helper="Mayúsculas, sin espacios">
          <Input
            value={values.license_plate}
            onChange={(e) =>
              set(
                "license_plate",
                e.target.value.toUpperCase().replace(/\s/g, ""),
              )
            }
            placeholder="AB123CD"
            className="font-mono"
          />
        </Field>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={
              operator.status !== "active" || patchMyOperator.isPending
            }
            className="h-11 w-full"
          >
            {patchMyOperator.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <SignOutButton redirectUrl="/sign-in">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </SignOutButton>
    </div>
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
