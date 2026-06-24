import type { ShipmentStatus } from "./shipments";
import type { Address } from "./common";

/**
 * Performance de un operador en los últimos N días (default 30).
 * Lo consume el detalle de operador (`/admin/operators/[id]`).
 */
export interface OperatorPerformanceDTO {
  delivered: number;
  failed: number;
  /** % entre 0 y 100. */
  success_rate: number;
  /** Bucket diario para el gráfico de barras. */
  daily: Array<{
    date: string; // ISO yyyy-mm-dd
    delivered: number;
    failed: number;
  }>;
}

/**
 * Mini info de assignment activo, sin todo el shipment hidratado. Usado en la
 * card "Assignments activos" del detalle de operador.
 */
export interface OperatorActiveAssignmentDTO {
  shipment_id: string;
  tracking_number: string;
  status: ShipmentStatus;
  shipping_address: Address;
  weight_grams_total: number;
}

/**
 * DTO extendido del operador para la tabla admin. Suma counts derivados de
 * relaciones que el GET list calcula con `_count`/aggregates de Prisma.
 */
export interface LogisticsOperatorAdminDTO {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  document_id: string;
  vehicle_type: "motorcycle" | "car" | "van" | "truck";
  license_plate: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  active_assignments_count: number;
  delivered_30d: number;
  failed_30d: number;
}

export interface LogisticsOperatorsAdminFilters {
  q?: string; // search por nombre/email/dni
  status?: Array<"active" | "inactive" | "suspended">;
  vehicle_type?: Array<"motorcycle" | "car" | "van" | "truck">;
}
