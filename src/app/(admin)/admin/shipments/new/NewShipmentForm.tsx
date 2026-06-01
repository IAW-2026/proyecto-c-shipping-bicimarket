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
import { useAdminParties } from "@/hooks/querys/parties/useAdminParties";
import { geocodePostalCode } from "@/lib/geo/ar-postal-codes";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import { multiOriginDiscountFactor } from "@/lib/multi-origin-discount";
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
  buyer_profile_id: "",
  buyer_name: "",
  service_level: "standard",
  ship_street: "",
  ship_number: "",
  ship_apartment: "",
  ship_city: "",
  ship_province: "",
  ship_postal: "",
  pickups: [{ ...EMPTY_PICKUP, packages: [{ ...EMPTY_PACKAGE }] }],
};

export function NewShipmentForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const { data: parties, isLoading: partiesLoading } = useAdminParties();
  const { mutate, isPending } = useAdminCreateShipment();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // Al elegir un comprador del select, cargamos su dirección de entrega completa
  // desde la DB (queda read-only: no se puede crear un destino que no exista).
  function selectBuyer(id: string) {
    const b = parties?.buyers.find((x) => x.id === id);
    if (!b) return;
    setValues((v) => ({
      ...v,
      buyer_profile_id: b.id,
      buyer_name: b.name ?? "",
      ship_street: b.address.street,
      ship_number: b.address.number,
      ship_apartment: b.address.apartment ?? "",
      ship_city: b.address.city,
      ship_province: b.address.province,
      ship_postal: b.address.postal_code,
    }));
  }

  // Idem para el vendedor de cada origen: carga su dirección de retiro.
  function selectSeller(i: number, id: string) {
    const s = parties?.sellers.find((x) => x.id === id);
    if (!s) return;
    setValues((v) => ({
      ...v,
      pickups: v.pickups.map((p, idx) =>
        idx === i
          ? {
              ...p,
              seller_profile_id: s.id,
              pickup_street: s.address.street,
              pickup_number: s.address.number,
              pickup_city: s.address.city,
              pickup_province: s.address.province,
              pickup_postal: s.address.postal_code,
            }
          : p,
      ),
    }));
  }

  const selectedBuyer = parties?.buyers.find(
    (b) => b.id === values.buyer_profile_id,
  );

  // ADR-005: preview de cotización por suma de tramos + descuento por
  // cantidad de orígenes. Los CPs vienen de las direcciones de los parties
  // elegidos (siempre conocidos por el dataset), así que el preview matchea
  // lo que va a calcular el backend al crear.
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

    if (!values.buyer_profile_id) {
      setError("Elegí un comprador.");
      return;
    }

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
        setError(`Origen #${i + 1}: elegí un vendedor`);
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

  const noParties =
    !partiesLoading &&
    parties &&
    (parties.sellers.length === 0 || parties.buyers.length === 0);

  const submitDisabled =
    isPending ||
    partiesLoading ||
    !values.buyer_profile_id ||
    values.pickups.some((p) => !p.seller_profile_id) ||
    (costPreview !== null && !costPreview.ok);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-card p-6"
    >
      {noParties && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          No hay vendedores o compradores cargados todavía. Corré el seed
          (`npm run db:seed`) para tener datos de prueba.
        </p>
      )}

      {/* Comprador + destino */}
      <Section
        title="Comprador y destino"
        subtitle="Elegí un comprador existente. Su dirección de entrega se carga automáticamente."
      >
        <Field label="Comprador" required>
          <Select
            value={values.buyer_profile_id}
            onValueChange={(id) => id && selectBuyer(id)}
            disabled={partiesLoading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  partiesLoading ? "Cargando…" : "Elegí un comprador…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {parties?.buyers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {values.buyer_profile_id && (
          <AddressReadOnly
            title="Dirección de entrega"
            receiver={selectedBuyer?.name}
            street={values.ship_street}
            number={values.ship_number}
            apartment={values.ship_apartment}
            city={values.ship_city}
            province={values.ship_province}
            postal={values.ship_postal}
          />
        )}
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

      {/* Orígenes (lista) */}
      <Section
        title="Orígenes"
        subtitle="Un pedido puede tener uno o más orígenes. Elegí el vendedor de cada origen; su dirección de retiro se carga sola."
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

                <Field label="Vendedor" required>
                  <Select
                    value={p.seller_profile_id}
                    onValueChange={(id) => id && selectSeller(i, id)}
                    disabled={partiesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          partiesLoading ? "Cargando…" : "Elegí un vendedor…"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {parties?.sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {p.seller_profile_id && (
                  <AddressReadOnly
                    title="Dirección de retiro"
                    street={p.pickup_street}
                    number={p.pickup_number}
                    city={p.pickup_city}
                    province={p.pickup_province}
                    postal={p.pickup_postal}
                  />
                )}

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
                  .
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

/**
 * Dirección en solo-lectura. Viene de un party real de la DB; no se edita para
 * garantizar que el pedido use datos existentes y que ciudad/provincia siempre
 * matcheen el CP.
 */
function AddressReadOnly({
  title,
  receiver,
  street,
  number,
  apartment,
  city,
  province,
  postal,
}: {
  title: string;
  receiver?: string;
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province: string;
  postal: string;
}) {
  const line1 = [street, number].filter(Boolean).join(" ");
  const line2 = [city, province, postal].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-0.5 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {receiver && <p className="font-medium">{receiver}</p>}
        <p>
          {line1}
          {apartment ? `, ${apartment}` : ""}
        </p>
        <p className="text-muted-foreground">{line2}</p>
      </div>
    </div>
  );
}
