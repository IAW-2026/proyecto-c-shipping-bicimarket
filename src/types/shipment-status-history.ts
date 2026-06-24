import type { StatusHistorySource as PrismaSource } from "@/generated/prisma/client";
import type { ShipmentStatus } from "./shipments";

export type StatusHistorySource = "logistics" | "admin" | "system";

type _check = [PrismaSource] extends [StatusHistorySource]
  ? [StatusHistorySource] extends [PrismaSource]
    ? true
    : never
  : never;
export const _statusHistorySourceCheck: _check = true;

/**
 * Forma del item devuelto por GET /api/v1/shipments/{id}/status-history.
 * Usado por el detalle admin (`AuditHistoryTable`) para mostrar forensia
 * de cambios de status: de qué a qué, quién, cuándo, con qué payload.
 */
export interface ShipmentStatusHistoryDTO {
  id: string;
  from_status: ShipmentStatus;
  to_status: ShipmentStatus;
  source: StatusHistorySource;
  payload: Record<string, unknown> | null;
  occurred_at: string;
}
