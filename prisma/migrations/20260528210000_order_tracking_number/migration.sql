-- ADR-005: tracking number compartido por todos los shipments del mismo order_id.
-- Buyer expone solo este. trackingNumber individual sigue existiendo (operador/carrier).

-- 1. Agregar columna nullable para backfill.
ALTER TABLE "shipments" ADD COLUMN "order_tracking_number" TEXT;

-- 2. Backfill: por cada order_id, asignar a TODOS sus shipments el
--    trackingNumber del shipment más temprano (createdAt asc).
UPDATE "shipments" s
SET "order_tracking_number" = src."tracking_number"
FROM (
  SELECT DISTINCT ON ("order_id")
    "order_id",
    "tracking_number"
  FROM "shipments"
  ORDER BY "order_id", "created_at" ASC
) src
WHERE s."order_id" = src."order_id";

-- 3. Volver la columna NOT NULL ahora que toda fila tiene valor.
ALTER TABLE "shipments" ALTER COLUMN "order_tracking_number" SET NOT NULL;

-- 4. Índice (búsqueda por order_tracking_number en el flujo del Buyer).
CREATE INDEX "shipments_order_tracking_number_idx" ON "shipments"("order_tracking_number");
