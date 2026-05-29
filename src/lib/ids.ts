// Generador de IDs con prefijo (estilo Stripe). Convención del proyecto: el
// schema de Prisma define `id String @id` sin @default — el ID lo genera la
// aplicación antes del insert. Esto deja el ID predecible / loggable antes de
// la escritura y evita acoplar a CUID/UUID del lado DB.

type IdPrefix =
  // Prefijos propios (Shipping App es dueña de estos IDs)
  | "shp"  // shipment
  | "qte"  // shipping_quote
  | "pkg"  // package
  | "evt"  // tracking_event
  | "dla"  // delivery_assignment
  | "prf"  // delivery_proof
  | "ssh"  // shipment_status_history
  | "lop"  // logistics_operator
  | "rat"  // shipping_rate
  | "grp"  // shipment_group (1 por order_id — dueño del tracking global del pedido)
  // Prefijos opacos a otras apps (normalmente Shipping NO los crea, los recibe
  // via S2S). Habilitados acá para el endpoint dev /api/v1/admin/shipments
  // que crea envíos manualmente sin depender de Seller/Buyer App.
  | "ord"  // order (Buyer)
  | "osg"  // order_seller_group (Buyer)
  | "sor"; // sales_order (Seller)

/**
 * Genera un ID con prefijo de recurso + 24 chars hex (random).
 * Ej: generateId("shp") → "shp_a1b2c3d4e5f6789012345678".
 */
export function generateId(prefix: IdPrefix): string {
  const hex = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${hex.slice(0, 24)}`;
}

/**
 * Genera un tracking number INDIVIDUAL formato "TRK-AR-XXXXXXXX" (8 dígitos).
 * Es el del pickup de cada vendedor — lo ve cada seller para su propio envío.
 * Sprint 1: random local. Sprint 2 podría integrarse a un carrier real.
 */
export function generateTrackingNumber(): string {
  const digits = Math.floor(10_000_000 + Math.random() * 90_000_000);
  return `TRK-AR-${digits}`;
}

/**
 * Genera el tracking number GLOBAL del pedido, formato "BMK-XXXXXXXXXX"
 * (10 dígitos). Vive en ShipmentGroup y es el ÚNICO que ve el comprador para
 * seguir su pedido completo. Prefijo distinto del individual (TRK-AR-) para
 * que sea distinguible de un vistazo y simplificar el ruteo en /track/{code}.
 */
export function generateGroupTrackingNumber(): string {
  const digits = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
  return `BMK-${digits}`;
}
