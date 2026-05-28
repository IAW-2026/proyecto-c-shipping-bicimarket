import type { TrackingEventType as PrismaTrackingEventType } from "@/generated/prisma/client";

export type TrackingEventType =
  | "created"
  | "ready_for_pickup"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned";

// Compile-time check vs Prisma enum
type _checkTrackingEventType = [PrismaTrackingEventType] extends [TrackingEventType]
  ? [TrackingEventType] extends [PrismaTrackingEventType]
    ? true
    : never
  : never;
export const _trackingEventTypeCheck: _checkTrackingEventType = true;

export interface TrackingEventDTO {
  id: string;
  event_type: TrackingEventType;
  location: string | null;
  note: string | null;
  occurred_at: string;
}

/**
 * Body de POST /api/v1/shipments/{id}/tracking-events (docs/03 §SH4).
 * Solo se aceptan eventos que el operador genera manualmente; "created" y
 * "ready_for_pickup" los crea el sistema al armar el shipment.
 */
export interface CreateTrackingEventBody {
  event_type: Exclude<TrackingEventType, "created" | "ready_for_pickup" | "delivered" | "returned">;
  location?: string;
  note?: string;
  occurred_at: string; // ISO 8601
}

/**
 * Body de POST /api/v1/shipments/{id}/deliver (docs/03 §SH4 deliver).
 * proof_photo_url es opcional — en mobile la captura puede fallar y el
 * operador debe poder cerrar la entrega igual.
 */
export interface DeliverShipmentBody {
  proof_photo_url?: string;
  signature_image_url?: string;
  note?: string;
  occurred_at: string;
}

export interface DeliverShipmentResponse {
  shipment_id: string;
  status: "delivered";
  delivered_at: string;
  proof: {
    photo_url: string | null;
    signature_url: string | null;
    note: string | null;
  };
}
