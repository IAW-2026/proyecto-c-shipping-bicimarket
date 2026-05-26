import type { AssignmentStatus as PrismaAssignmentStatus } from "@/generated/prisma/enums";
import type { Address } from "./common";
import type { ShipmentStatus } from "./shipments";

export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "reassigned"
  | "cancelled";

type _checkAssignmentStatus = [PrismaAssignmentStatus] extends [AssignmentStatus]
  ? [AssignmentStatus] extends [PrismaAssignmentStatus]
    ? true
    : never
  : never;
export const _assignmentStatusCheck: _checkAssignmentStatus = true;

/**
 * Forma del item que devuelve GET /api/v1/my/assignments (docs/03 §SH5 my).
 * Incluye dirección hidratada para que la UI mobile-first del operador no
 * tenga que hacer otra round-trip.
 *
 * `is_self_assigned`:
 *   - true  → el operador ya tiene un assignment activo sobre este envío.
 *   - false → el envío está disponible (en `ready_for_pickup` sin operador).
 *             Si el operador toca "Ir a retirar", el backend auto-crea el
 *             assignment y avanza el estado.
 */
export interface AssignmentDTO {
  id: string; // shp_… del shipment (es el recurso principal en este endpoint)
  tracking_number: string;
  status: ShipmentStatus;
  pickup_address: Address;
  shipping_address: Address;
  weight_grams_total: number;
  packages_count: number;
  is_self_assigned: boolean;
}

/** Body de POST /api/v1/shipments/{id}/assignments (admin, docs/03 §SH5 create). */
export interface CreateAssignmentBody {
  operator_clerk_user_id: string;
}

/** Body de PATCH /api/v1/shipments/{id}/assignments/{aid} (admin reassign). */
export interface PatchAssignmentBody {
  status?: AssignmentStatus;
  operator_clerk_user_id?: string;
}
