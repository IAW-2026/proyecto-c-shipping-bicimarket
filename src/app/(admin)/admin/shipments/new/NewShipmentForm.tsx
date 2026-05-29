"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  MapPin,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
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
import { geocodePostalCode } from "@/lib/geo/ar-postal-codes";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { multiOriginDiscountFactor } from "@/lib/multi-origin-discount";
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

interface PickupRow {
  seller_profile_id: string;
  pickup_street: string;
  pickup_number: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal: string;
  packages: PackageRow[];
}

interface FormState {
  buyer_profile_id: string;
  buyer_name: string;
  service_level: ServiceLevel;
  ship_street: string;
  ship_number: string;
  ship_apartment: string;
  ship_city: string;
  ship_province: string;
  ship_postal: string;
  pickups: PickupRow[];
}

const EMPTY_PACKAGE: PackageRow = {
  weight_grams: "5000",
  length_cm: "40",
  width_cm: "30",
  height_cm: "20",
  description: "Producto de prueba",
};

const FIRST_PICKUP: PickupRow = {
  seller_profile_id: "slp_pedalesplata",
  pickup_street: "Av. Rivadavia",
  pickup_number: "9000",
  pickup_city: "Caballito",
  pickup_province: "Buenos Aires",
  pickup_postal: "C1406",
  packages: [{ ...EMPTY_PACKAGE }],
};

const EMPTY_PICKUP: PickupRow = {
  seller_profile_id: "",
  pickup_street: "",
  pickup_number: "",
  pickup_city: "",
  pickup_province: "",
  pickup_postal: "",
  packages: [{ ...EMPTY_PACKAGE }],
};

const INITIAL: FormState = {
  buyer_profile_id: "byp_mariagonzalez",
  buyer_name: "María González",
  service_level: "standard",
  ship_street: "Av. Corrientes",
  ship_number: "1234",
  ship_apartment: "5B",
  ship_city: "CABA",
  ship_province: "Buenos Aires",
  ship_postal: "C1043",
  pickups: [{ ...FIRST_PICKUP }],
};

export function NewShipmentForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useAdminCreateShipment();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // ADR-005: preview de cotización por suma de tramos + descuento por
  // cantidad de orígenes. Reemplaza el TSP del modelo anterior — cada origen
  // cotiza independiente y se aplica un descuento lineal sobre la suma.
  // Como no tenemos acceso a las tarifas reales desde el cliente, mostramos
  // distancias y porcentaje de descuento; el costo final se calcula al
  // crear el pedido.
  type CostPreview =
    | {
        ok: true;
        destCity: string;
        legs: Array<{ index: number; sellerId: string; km: number }>;
        totalKm: number;
        discountPct: number;
      }
    | {
        ok: false;
        missingDest?: string;
        unknownPickupIndexes?: number[];
      };

  const costPreview = useMemo<CostPreview | null>(() => {
    const destCp = values.ship_postal.trim().toUpperCase();
    if (!destCp) return null;
    const destEntry = geocodePostalCode(destCp);
    if (!destEntry) {
      return { ok: false, missingDest: destCp };
    }
    const unknownIdx: number[] = [];
    const legs: Array<{ index: number; sellerId: string; km: number }> = [];
    for (let i = 0; i < values.pickups.length; i++) {
      const cp = values.pickups[i].pickup_postal.trim().toUpperCase();
      if (!cp) return null; // el usuario todavía está completando
      const entry = geocodePostalCode(cp);
      if (!entry) {
        unknownIdx.push(i);
        continue;
      }
      const km = distanceBetweenPostalCodes(cp, destCp);
      if (km === null) {
        unknownIdx.push(i);
        continue;
      }
      legs.push({
        index: i,
        sellerId: values.pickups[i].seller_profile_id || `#${i + 1}`,
        km,
      });
    }
    if (unknownIdx.length > 0) {
      return { ok: false, unknownPickupIndexes: unknownIdx };
    }
    const totalKm = legs.reduce((s, l) => s + l.km, 0);
    const discountPct = multiOriginDiscountFactor(legs.length);
    return {
      ok: true,
      destCity: destEntry.city,
      legs,
      totalKm,
      discountPct,
    };
  }, [values.pickups, values.ship_postal]);

  function updatePickup<K extends keyof PickupRow>(
    i: number,
    key: K,
    value: PickupRow[K],
  ) {
    setValues((v) => ({
      ...v,
      pickups: v.pickups.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      ),
    }));
  }

  function addPickup() {
    setValues((v) => ({
      ...v,
      pickups: [...v.pickups, { ...EMPTY_PICKUP, packages: [{ ...EMPTY_PACKAGE }] }],
    }));
  }

  function removePickup(i: number) {
    setValues((v) => ({
      ...v,
      pickups: v.pickups.filter((_, idx) => idx !== i),
    }));
  }

  function updatePackage(
    pickupIdx: number,
    pkgIdx: number,
    key: keyof PackageRow,
    value: string,
  ) {
    setValues((v) => ({
      ...v,
      pickups: v.pickups.map((p, idx) =>
        idx === pickupIdx
          ? {
              ...p,
              packages: p.packages.map((pkg, pi) =>
                pi === pkgIdx ? { ...pkg, [key]: value } : pkg,
              ),
            }
          : p,
      ),
    }));
  }

  function addPackage(pickupIdx: number) {
    setValues((v) => ({
      ...v,
      pickups: v.pickups.map((p, idx) =>
        idx === pickupIdx
          ? { ...p, packages: [...p.packages, { ...EMPTY_PACKAGE }] }
          : p,
      ),
    }));
  }

  function removePackage(pickupIdx: number, pkgIdx: number) {
    setValues((v) => ({
      ...v,
      pickups: v.pickups.map((p, idx) =>
        idx === pickupIdx
          ? { ...p, packages: p.packages.filter((_, pi) => pi !== pkgIdx) }
          : p,
      ),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: CreateAdminShipmentBody = {
      buyer_profile_id: values.buyer_profile_id.trim(),
      buyer_name: values.buyer_name.trim() || undefined,
      service_level: values.service_level,
      shipping_address: {
        street: values.ship_street.trim(),
        number: values.ship_number.trim(),
        apartment: values.ship_apartment.trim() || undefined,
        city: values.ship_city.trim(),
        province: values.ship_province.trim(),
        postal_code: values.ship_postal.trim().toUpperCase(),
        country: "AR",
      },
      pickups: values.pickups.map((p) => ({
        seller_profile_id: p.seller_profile_id.trim(),
        pickup_address: {
          street: p.pickup_street.trim(),
          number: p.pickup_number.trim(),
          city: p.pickup_city.trim(),
          province: p.pickup_province.trim(),
          postal_code: p.pickup_postal.trim().toUpperCase(),
          country: "AR",
        },
        packages: p.packages.map((pkg) => ({
          weight_grams: parseInt(pkg.weight_grams, 10),
          length_cm: parseInt(pkg.length_cm, 10),
          width_cm: parseInt(pkg.width_cm, 10),
          height_cm: parseInt(pkg.height_cm, 10),
          description: pkg.description.trim() || undefined,
        })),
      })),
    };

    // Validación cliente
    for (let i = 0; i < body.pickups.length; i++) {
      const pk = body.pickups[i];
      if (!pk.seller_profile_id) {
        setError(`Origen #${i + 1}: falta seller_profile_id`);
        return;
      }
      if (
        pk.packages.some(
          (p) => Number.isNaN(p.weight_grams) || p.weight_grams <= 0,
        )
      ) {
        setError(`Origen #${i + 1}: algún paquete tiene peso inválido`);
        return;
      }
      if (
        pk.packages.some(
          (p) =>
            Number.isNaN(p.length_cm) ||
            Number.isNaN(p.width_cm) ||
            Number.isNaN(p.height_cm),
        )
      ) {
        setError(`Origen #${i + 1}: algún paquete tiene dimensiones inválidas`);
        return;
      }
    }

    mutate(body, {
      onSuccess: (res) => {
        router.push(
          `/admin/shipments?order_id=${encodeURIComponent(res.order_id)}`,
        );
      },
    });
  }

  const submitDisabled =
    isPending || (costPreview !== null && !costPreview.ok);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-card p-6"
    >
      {/* Identidades opacas */}
      <Section
        title="Identidades"
        subtitle="ID opaco del Buyer. El seller se define por origen (más abajo)."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Buyer profile ID" required>
            <Input
              value={values.buyer_profile_id}
              onChange={(e) => set("buyer_profile_id", e.target.value)}
              placeholder="byp_mariagonzalez"
              className="font-mono"
            />
          </Field>
          <Field
            label="Nombre del receptor"
            helper="Aparece en el detalle del operador (snapshot)."
          >
            <Input
              value={values.buyer_name}
              onChange={(e) => set("buyer_name", e.target.value)}
              placeholder="María González"
            />
          </Field>
        </div>
      </Section>

      {/* Servicio */}
      <Section
        title="Servicio"
        subtitle="Aplica a todo el pedido (la ruta es única)."
      >
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

      {/* Destino único */}
      <Section
        title="Destino"
        subtitle="Dirección única de entrega. Todos los orígenes terminan acá."
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
            <Input
              value={values.ship_street}
              onChange={(e) => set("ship_street", e.target.value)}
            />
          </Field>
          <Field label="Número" required>
            <Input
              value={values.ship_number}
              onChange={(e) => set("ship_number", e.target.value)}
            />
          </Field>
          <Field label="Depto / piso">
            <Input
              value={values.ship_apartment}
              onChange={(e) => set("ship_apartment", e.target.value)}
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={values.ship_city}
              onChange={(e) => set("ship_city", e.target.value)}
            />
          </Field>
          <Field label="Provincia">
            <Input
              value={values.ship_province}
              onChange={(e) => set("ship_province", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Orígenes (lista) */}
      <Section
        title="Orígenes"
        subtitle="Un pedido puede tener uno o más orígenes. Cada origen tiene su seller, dirección de retiro y paquetes propios."
      >
        <div className="space-y-3">
          {values.pickups.map((p, i) => {
            const unknownIdxs =
              costPreview && !costPreview.ok
                ? costPreview.unknownPickupIndexes
                : undefined;
            const isUnknownCp = unknownIdxs?.includes(i) ?? false;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable
                key={i}
                className={`space-y-3 rounded-lg border p-4 ${
                  isUnknownCp
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">
                    Origen #{i + 1}
                    {p.seller_profile_id && (
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                        {p.seller_profile_id}
                      </span>
                    )}
                  </h4>
                  {values.pickups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePickup(i)}
                      aria-label={`Eliminar origen ${i + 1}`}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                <Field label="Seller profile ID" required>
                  <Input
                    value={p.seller_profile_id}
                    onChange={(e) =>
                      updatePickup(i, "seller_profile_id", e.target.value)
                    }
                    placeholder="slp_pedalesplata"
                    className="font-mono"
                  />
                </Field>

                <Field label="Código postal del retiro" required>
                  <PostalCodeCombobox
                    value={p.pickup_postal}
                    onSelect={(entry) => {
                      setValues((v) => ({
                        ...v,
                        pickups: v.pickups.map((pk, idx) =>
                          idx === i
                            ? {
                                ...pk,
                                pickup_postal: entry.cp,
                                pickup_city: entry.city,
                                pickup_province: entry.province,
                              }
                            : pk,
                        ),
                      }));
                    }}
                    placeholder="Ej: C1406 (Caballito)…"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Calle" required>
                    <Input
                      value={p.pickup_street}
                      onChange={(e) =>
                        updatePickup(i, "pickup_street", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Número" required>
                    <Input
                      value={p.pickup_number}
                      onChange={(e) =>
                        updatePickup(i, "pickup_number", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Ciudad">
                    <Input
                      value={p.pickup_city}
                      onChange={(e) =>
                        updatePickup(i, "pickup_city", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Provincia">
                    <Input
                      value={p.pickup_province}
                      onChange={(e) =>
                        updatePickup(i, "pickup_province", e.target.value)
                      }
                    />
                  </Field>
                </div>

                {/* Paquetes del pickup */}
                <div className="space-y-2 rounded-md border border-border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Paquetes de este origen
                  </p>
                  {p.packages.map((pkg, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable
                    <div key={j} className="grid grid-cols-2 gap-2 md:grid-cols-6">
                      <Field label="Peso (g)" required>
                        <Input
                          type="number"
                          value={pkg.weight_grams}
                          onChange={(e) =>
                            updatePackage(i, j, "weight_grams", e.target.value)
                          }
                          min={1}
                        />
                      </Field>
                      <Field label="Largo (cm)" required>
                        <Input
                          type="number"
                          value={pkg.length_cm}
                          onChange={(e) =>
                            updatePackage(i, j, "length_cm", e.target.value)
                          }
                          min={1}
                        />
                      </Field>
                      <Field label="Ancho (cm)" required>
                        <Input
                          type="number"
                          value={pkg.width_cm}
                          onChange={(e) =>
                            updatePackage(i, j, "width_cm", e.target.value)
                          }
                          min={1}
                        />
                      </Field>
                      <Field label="Alto (cm)" required>
                        <Input
                          type="number"
                          value={pkg.height_cm}
                          onChange={(e) =>
                            updatePackage(i, j, "height_cm", e.target.value)
                          }
                          min={1}
                        />
                      </Field>
                      <div className="col-span-2 flex items-end gap-2">
                        <Field label="Descripción" className="flex-1">
                          <Textarea
                            value={pkg.description}
                            onChange={(e) =>
                              updatePackage(
                                i,
                                j,
                                "description",
                                e.target.value,
                              )
                            }
                            rows={1}
                            className="min-h-9"
                          />
                        </Field>
                        {p.packages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removePackage(i, j)}
                            aria-label="Eliminar paquete"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPackage(i)}
                  >
                    <Plus className="size-3.5" /> Agregar paquete
                  </Button>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addPickup}>
            <Plus className="size-3.5" /> Agregar otro origen
          </Button>
        </div>
      </Section>

      {/* Preview de cotización (ADR-005: suma de tramos + descuento) */}
      {costPreview && (
        costPreview.ok ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="size-4 shrink-0" />
                <span>
                  {costPreview.legs.length === 1
                    ? "Cotización single-origen"
                    : `${costPreview.legs.length} orígenes`}{" "}
                  → <MapPin className="inline size-3" />{" "}
                  <span className="font-medium">{costPreview.destCity}</span>
                </span>
              </div>
              {costPreview.discountPct > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold">
                  Descuento multi-origen ·{" "}
                  {(costPreview.discountPct * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <ul className="space-y-1 pl-6 text-xs">
              {costPreview.legs.map((leg) => (
                <li
                  key={leg.index}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono">
                      {leg.sellerId}
                    </span>
                    <ArrowRight className="size-3 opacity-60" />
                    <span>{costPreview.destCity}</span>
                  </span>
                  <span className="tabular-nums">≈ {leg.km} km</span>
                </li>
              ))}
            </ul>
            <p className="pl-6 text-[11px] opacity-80">
              Suma de tramos · ≈{" "}
              <span className="font-semibold tabular-nums">
                {costPreview.totalKm} km
              </span>
              {costPreview.discountPct > 0 && (
                <>
                  {" "}
                  · costo final con −{(costPreview.discountPct * 100).toFixed(0)}%
                  aplicado al sumar las tarifas matcheadas
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">Cobertura incompleta</p>
              {costPreview.missingDest ? (
                <p className="text-xs opacity-80">
                  El CP destino{" "}
                  <span className="font-mono">{costPreview.missingDest}</span>{" "}
                  no está en nuestro dataset.
                </p>
              ) : costPreview.unknownPickupIndexes ? (
                <p className="text-xs opacity-80">
                  Los siguientes orígenes tienen CP desconocido:{" "}
                  <span className="font-mono">
                    {costPreview.unknownPickupIndexes
                      .map((i) => `#${i + 1}`)
                      .join(", ")}
                  </span>
                  . Cambiá el CP o pedile al admin que lo agregue al dataset.
                </p>
              ) : null}
            </div>
          </div>
        )
      )}

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
        <Button type="submit" disabled={submitDisabled}>
          {isPending ? "Creando…" : "Crear pedido"}
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
