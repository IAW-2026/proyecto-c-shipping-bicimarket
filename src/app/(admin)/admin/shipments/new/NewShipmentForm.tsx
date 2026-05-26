"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminCreateShipment } from "@/hooks/querys/shipments/useAdminCreateShipment";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { geocodePostalCode } from "@/lib/geo/ar-postal-codes";
import { PostalCodeCombobox } from "@/components/shipping/PostalCodeCombobox";
import type { ServiceLevel } from "@/types/shipments";
import type { CreateAdminShipmentBody } from "@/types/admin-shipments";

interface PackageRow {
  weight_grams: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  description: string;
}

interface FormState {
  seller_profile_id: string;
  buyer_profile_id: string;
  buyer_name: string;
  service_level: ServiceLevel;
  pickup_street: string;
  pickup_number: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal: string;
  ship_street: string;
  ship_number: string;
  ship_apartment: string;
  ship_city: string;
  ship_province: string;
  ship_postal: string;
  packages: PackageRow[];
}

const EMPTY_PACKAGE: PackageRow = {
  weight_grams: "5000",
  length_cm: "40",
  width_cm: "30",
  height_cm: "20",
  description: "Producto de prueba",
};

const INITIAL: FormState = {
  seller_profile_id: "slp_pedalesplata",
  buyer_profile_id: "byp_mariagonzalez",
  buyer_name: "María González",
  service_level: "standard",
  pickup_street: "Av. Rivadavia",
  pickup_number: "9000",
  pickup_city: "Caballito",
  pickup_province: "Buenos Aires",
  pickup_postal: "C1406",
  ship_street: "Av. Corrientes",
  ship_number: "1234",
  ship_apartment: "5B",
  ship_city: "CABA",
  ship_province: "Buenos Aires",
  ship_postal: "C1043",
  packages: [{ ...EMPTY_PACKAGE }],
};

export function NewShipmentForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useAdminCreateShipment();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // Preview live de cobertura + distancia. Si alguno de los CPs no está en
  // el dataset hardcoded de AR, el backend va a tirar 422 POSTAL_CODE_UNKNOWN,
  // así que ya lo detectamos en client para deshabilitar el botón submit.
  const coverage = useMemo(() => {
    const pickupCP = values.pickup_postal.trim().toUpperCase();
    const shipCP = values.ship_postal.trim().toUpperCase();
    if (!pickupCP || !shipCP) return null;

    const pickupEntry = geocodePostalCode(pickupCP);
    const shipEntry = geocodePostalCode(shipCP);
    if (!pickupEntry || !shipEntry) {
      return {
        ok: false as const,
        missing: !pickupEntry ? pickupCP : shipCP,
      };
    }
    const km = distanceBetweenPostalCodes(pickupCP, shipCP) ?? 0;
    return {
      ok: true as const,
      km,
      pickupCity: pickupEntry.city,
      shipCity: shipEntry.city,
    };
  }, [values.pickup_postal, values.ship_postal]);

  function updatePackage(i: number, key: keyof PackageRow, value: string) {
    setValues((v) => ({
      ...v,
      packages: v.packages.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      ),
    }));
  }

  function addPackage() {
    setValues((v) => ({ ...v, packages: [...v.packages, { ...EMPTY_PACKAGE }] }));
  }
  function removePackage(i: number) {
    setValues((v) => ({
      ...v,
      packages: v.packages.filter((_, idx) => idx !== i),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: CreateAdminShipmentBody = {
      seller_profile_id: values.seller_profile_id.trim(),
      buyer_profile_id: values.buyer_profile_id.trim(),
      buyer_name: values.buyer_name.trim() || undefined,
      service_level: values.service_level,
      pickup_address: {
        street: values.pickup_street.trim(),
        number: values.pickup_number.trim(),
        city: values.pickup_city.trim(),
        province: values.pickup_province.trim(),
        postal_code: values.pickup_postal.trim().toUpperCase(),
        country: "AR",
      },
      shipping_address: {
        street: values.ship_street.trim(),
        number: values.ship_number.trim(),
        apartment: values.ship_apartment.trim() || undefined,
        city: values.ship_city.trim(),
        province: values.ship_province.trim(),
        postal_code: values.ship_postal.trim().toUpperCase(),
        country: "AR",
      },
      packages: values.packages.map((p) => ({
        weight_grams: parseInt(p.weight_grams, 10),
        length_cm: parseInt(p.length_cm, 10),
        width_cm: parseInt(p.width_cm, 10),
        height_cm: parseInt(p.height_cm, 10),
        description: p.description.trim() || undefined,
      })),
    };

    // Validación cliente
    if (body.packages.some((p) => Number.isNaN(p.weight_grams) || p.weight_grams <= 0)) {
      setError("Algún paquete tiene peso inválido");
      return;
    }
    if (body.packages.some((p) => Number.isNaN(p.length_cm) || Number.isNaN(p.width_cm) || Number.isNaN(p.height_cm))) {
      setError("Algún paquete tiene dimensiones inválidas");
      return;
    }

    mutate(body, {
      onSuccess: (shipment) => {
        router.push(`/admin/shipments/${shipment.id}`);
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-card p-6"
    >
      {/* Identidades opacas */}
      <Section title="Identidades" subtitle="IDs opacos de Buyer y Seller. Usá los del seed o cualquier string `slp_...`/`byp_...`.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Seller profile ID" required>
            <Input
              value={values.seller_profile_id}
              onChange={(e) => set("seller_profile_id", e.target.value)}
              placeholder="slp_pedalesplata"
              className="font-mono"
            />
          </Field>
          <Field label="Buyer profile ID" required>
            <Input
              value={values.buyer_profile_id}
              onChange={(e) => set("buyer_profile_id", e.target.value)}
              placeholder="byp_mariagonzalez"
              className="font-mono"
            />
          </Field>
        </div>
        <Field label="Nombre del receptor" helper="Aparece en el detalle del operador (snapshot).">
          <Input
            value={values.buyer_name}
            onChange={(e) => set("buyer_name", e.target.value)}
            placeholder="María González"
          />
        </Field>
      </Section>

      {/* Servicio */}
      <Section title="Servicio">
        <Field label="Service level" required>
          <Select
            value={values.service_level}
            onValueChange={(v) => set("service_level", v as ServiceLevel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Estándar (3-5 días)</SelectItem>
              <SelectItem value="express">Express (1-2 días)</SelectItem>
              <SelectItem value="same_day">Mismo día</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* Dirección de retiro */}
      <Section
        title="Dirección de retiro (origen)"
        subtitle="Buscá el código postal del dataset — autocompleta ciudad y provincia."
      >
        <Field label="Código postal" required>
          <PostalCodeCombobox
            value={values.pickup_postal}
            onSelect={(entry) => {
              setValues((v) => ({
                ...v,
                pickup_postal: entry.cp,
                pickup_city: entry.city,
                pickup_province: entry.province,
              }));
            }}
            placeholder="Ej: C1406 (Caballito), B8000 (Bahía Blanca)…"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Calle" required>
            <Input value={values.pickup_street} onChange={(e) => set("pickup_street", e.target.value)} />
          </Field>
          <Field label="Número" required>
            <Input value={values.pickup_number} onChange={(e) => set("pickup_number", e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={values.pickup_city} onChange={(e) => set("pickup_city", e.target.value)} />
          </Field>
          <Field label="Provincia">
            <Input value={values.pickup_province} onChange={(e) => set("pickup_province", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Dirección de entrega */}
      <Section
        title="Dirección de entrega (destino)"
        subtitle="Buscá el código postal del dataset — autocompleta ciudad y provincia."
      >
        <Field label="Código postal" required>
          <PostalCodeCombobox
            value={values.ship_postal}
            onSelect={(entry) => {
              setValues((v) => ({
                ...v,
                ship_postal: entry.cp,
                ship_city: entry.city,
                ship_province: entry.province,
              }));
            }}
            placeholder="Buscar CP de destino…"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Calle" required>
            <Input value={values.ship_street} onChange={(e) => set("ship_street", e.target.value)} />
          </Field>
          <Field label="Número" required>
            <Input value={values.ship_number} onChange={(e) => set("ship_number", e.target.value)} />
          </Field>
          <Field label="Depto / piso">
            <Input value={values.ship_apartment} onChange={(e) => set("ship_apartment", e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={values.ship_city} onChange={(e) => set("ship_city", e.target.value)} />
          </Field>
          <Field label="Provincia">
            <Input value={values.ship_province} onChange={(e) => set("ship_province", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Preview de cobertura */}
      {coverage && (
        coverage.ok ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            <MapPin className="size-4 shrink-0" />
            <span>
              <strong>{coverage.pickupCity}</strong> → <strong>{coverage.shipCity}</strong> · ≈{" "}
              <span className="font-semibold tabular-nums">{coverage.km} km</span>
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">No contamos con envíos al destino que ingresaste.</p>
              <p className="text-xs opacity-80">
                El CP <span className="font-mono">{coverage.missing}</span> no está en nuestra cobertura. Probá con otro o pedile al admin que agregue ese CP al dataset.
              </p>
            </div>
          </div>
        )
      )}

      {/* Paquetes */}
      <Section
        title="Paquetes"
        subtitle="Cada caja con sus dimensiones y peso. La suma de pesos calcula el costo según la tarifaría activa (si no hay match usa default)."
      >
        <div className="space-y-3">
          {values.packages.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 md:grid-cols-6">
              <Field label="Peso (g)" required>
                <Input
                  type="number"
                  value={p.weight_grams}
                  onChange={(e) => updatePackage(i, "weight_grams", e.target.value)}
                  min={1}
                />
              </Field>
              <Field label="Largo (cm)" required>
                <Input
                  type="number"
                  value={p.length_cm}
                  onChange={(e) => updatePackage(i, "length_cm", e.target.value)}
                  min={1}
                />
              </Field>
              <Field label="Ancho (cm)" required>
                <Input
                  type="number"
                  value={p.width_cm}
                  onChange={(e) => updatePackage(i, "width_cm", e.target.value)}
                  min={1}
                />
              </Field>
              <Field label="Alto (cm)" required>
                <Input
                  type="number"
                  value={p.height_cm}
                  onChange={(e) => updatePackage(i, "height_cm", e.target.value)}
                  min={1}
                />
              </Field>
              <div className="col-span-2 flex items-end gap-2 md:col-span-2">
                <Field label="Descripción" className="flex-1">
                  <Textarea
                    value={p.description}
                    onChange={(e) => updatePackage(i, "description", e.target.value)}
                    rows={1}
                    className="min-h-9"
                  />
                </Field>
                {values.packages.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePackage(i)}
                    aria-label="Eliminar paquete"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPackage}>
            <Plus className="size-3.5" /> Agregar paquete
          </Button>
        </div>
      </Section>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/shipments")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || (coverage !== null && !coverage.ok)}
        >
          {isPending ? "Creando…" : "Crear envío"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  helper,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}
