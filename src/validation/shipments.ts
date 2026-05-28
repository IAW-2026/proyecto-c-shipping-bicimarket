import { z } from "zod";

// Schemas zod para body validation. Usados en:
//   - Route handlers: safeParse del request.json() en POST/PATCH
//   - Forms del frontend: @hookform/resolvers/zod
//
// CADA schema debe inferir a un tipo equivalente al CreateXBody/UpdateXBody
// de src/types/ (no usamos z.infer directo en types/ para evitar acoplar la
// API pública del tipo a zod). Los tests de equivalencia se documentan abajo.

const dimensionsSchema = z.object({
  weight_grams: z.number().int().positive(),
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
});

// ─── POST /api/v1/shipments (S2S Seller) ───────────────────────────────────

export const createShipmentSchema = z.object({
  shipping_quote_id: z.string().min(1),
  order_id: z.string().min(1),
  order_seller_group_id: z.string().min(1),
  sales_order_id: z.string().min(1),
  seller_profile_id: z.string().min(1),
  buyer_profile_id: z.string().min(1),
  shipping_address_snapshot: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    apartment: z.string().optional(),
    city: z.string().min(1),
    province: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(2),
  }),
  packages: z
    .array(dimensionsSchema.extend({ description: z.string().optional() }))
    .min(1),
});

// ─── PATCH /api/v1/shipments/{id}/status ───────────────────────────────────

export const patchShipmentStatusSchema = z.object({
  status: z.enum([
    "created",
    "ready_for_pickup",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed_delivery",
    "returned",
  ]),
  note: z.string().optional(),
});

// ─── POST /api/v1/shipments/{id}/packages ──────────────────────────────────

export const addPackageSchema = dimensionsSchema.extend({
  description: z.string().optional(),
});

// ─── POST /api/v1/shipments/{id}/tracking-events ──────────────────────────
// Solo eventos que el operador genera manualmente — "created"/"ready_for_pickup"
// los crea el sistema, "delivered" va por el endpoint /deliver, "returned"
// es transición automática tras N intentos fallidos.

export const createTrackingEventSchema = z.object({
  event_type: z.enum([
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "failed_delivery",
  ]),
  location: z.string().optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime(),
});

// ─── POST /api/v1/shipments/{id}/deliver ───────────────────────────────────
// proof_photo_url es OPCIONAL: en mobile la captura/subida puede fallar y el
// operador debe poder cerrar la entrega igual. Si viene, validamos URL/base64
// con min length; si no, se guarda null en DeliveryProof.

export const deliverShipmentSchema = z.object({
  proof_photo_url: z.string().min(1).optional(),
  signature_image_url: z.string().min(1).optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime(),
});
