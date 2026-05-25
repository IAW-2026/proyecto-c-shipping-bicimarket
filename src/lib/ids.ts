// Generador de IDs con prefijo (estilo Stripe). Convención del proyecto: el
// schema de Prisma define `id String @id` sin @default — el ID lo genera la
// aplicación antes del insert. Esto deja el ID predecible / loggable antes de
// la escritura y evita acoplar a CUID/UUID del lado DB.

type IdPrefix =
  | "shp"  // shipment
  | "qte"  // shipping_quote
  | "pkg"  // package
  | "evt"  // tracking_event
  | "dla"  // delivery_assignment
  | "prf"  // delivery_proof
  | "ssh"  // shipment_status_history
  | "lop"  // logistics_operator
  | "rat"; // shipping_rate

/**
 * Genera un ID con prefijo de recurso + 24 chars hex (random).
 * Ej: generateId("shp") → "shp_a1b2c3d4e5f6789012345678".
 */
export function generateId(prefix: IdPrefix): string {
  const hex = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${hex.slice(0, 24)}`;
}

/**
 * Genera un tracking number formato "TRK-AR-XXXXXXXX" (8 dígitos).
 * Sprint 1: random local. Sprint 2 podría integrarse a un carrier real.
 */
export function generateTrackingNumber(): string {
  const digits = Math.floor(10_000_000 + Math.random() * 90_000_000);
  return `TRK-AR-${digits}`;
}
