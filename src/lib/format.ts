// Helpers de formato para UI. Centralizan locale (es-AR) y unidades.

/**
 * Formatea centavos ARS al string canonico "$ 12.345,67".
 * Ej: formatArs(1200000) === "$ 12.000,00"
 */
export function formatArs(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Formatea gramos a kg con 1 decimal coma. Ej: 14500 -> "14,5 kg". */
export function formatWeightKg(grams: number): string {
  const kg = grams / 1000;
  return `${kg.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

/** Fecha corta tipo "26/05 14:40". */
export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fecha larga "1 de mayo de 2026". */
export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Relative time tipo "hace 3 h", "hace 5 min", "ahora". */
export function formatRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return "ahora";

  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) {
      return rtf.format(-Math.round(diffSec / secs), unit);
    }
  }
  return "ahora";
}

/** Trunca un string mostrando inicio + "…" + final. Ej: "shp_a1b2…f6789". */
export function truncateId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/** Une partes de una dirección en una linea legible. */
export function formatAddressLine(addr: {
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province?: string;
  postal_code?: string;
}): string {
  const left = `${addr.street} ${addr.number}${addr.apartment ? `, ${addr.apartment}` : ""}`;
  const right = [addr.city, addr.province].filter(Boolean).join(", ");
  return right ? `${left}, ${right}` : left;
}

/** URL para "Abrir en Maps" en Google. */
export function mapsUrl(addr: {
  street: string;
  number: string;
  city: string;
  province?: string;
}): string {
  const q = `${addr.street} ${addr.number}, ${addr.city}${addr.province ? `, ${addr.province}` : ""}`;
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}
