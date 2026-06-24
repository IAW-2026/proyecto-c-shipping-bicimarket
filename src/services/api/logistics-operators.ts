import { api } from "@/lib/axios";
import type { PaginatedResponse } from "@/types/common";
import type {
  LogisticsOperatorDTO,
  CreateLogisticsOperatorBody,
  OperatorStatus,
  VehicleType,
} from "@/types/logistics-operators";
import type {
  LogisticsOperatorAdminDTO,
  LogisticsOperatorsAdminFilters,
  OperatorActiveAssignmentDTO,
  OperatorPerformanceDTO,
} from "@/types/operator-performance";
import type { OperatorsKpisDTO } from "@/types/admin-kpis";

// ── Lists ──────────────────────────────────────────────────────────────────

/**
 * Listado simple — para dropdowns y modales de asignación.
 * Trae solo el shape básico (sin counts).
 */
export async function listOperators(
  page = 1,
  perPage = 20,
  filters?: { status?: OperatorStatus[] },
): Promise<PaginatedResponse<LogisticsOperatorDTO>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  filters?.status?.forEach((s) => params.append("status[]", s));

  const res = await api.get<PaginatedResponse<LogisticsOperatorDTO>>(
    `/v1/logistics-operators?${params.toString()}`,
  );
  return res.data;
}

/**
 * Listado para tabla admin — incluye active_assignments_count, delivered_30d,
 * failed_30d. Soporta filtros + sort + paginación.
 */
export async function listOperatorsAdmin(
  filters: LogisticsOperatorsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<PaginatedResponse<LogisticsOperatorAdminDTO>> {
  const params = new URLSearchParams({
    detailed: "1",
    page: String(page),
    per_page: String(perPage),
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  if (filters.q) params.set("q", filters.q);
  filters.status?.forEach((s) => params.append("status[]", s));
  filters.vehicle_type?.forEach((v) => params.append("vehicle_type[]", v));

  const res = await api.get<PaginatedResponse<LogisticsOperatorAdminDTO>>(
    `/v1/logistics-operators?${params.toString()}`,
  );
  return res.data;
}

// ── Detail / aggregates ────────────────────────────────────────────────────

export async function getOperator(
  operatorId: string,
): Promise<LogisticsOperatorDTO> {
  const res = await api.get<LogisticsOperatorDTO>(
    `/v1/logistics-operators/${operatorId}`,
  );
  return res.data;
}

export async function getOperatorPerformance(
  operatorId: string,
): Promise<OperatorPerformanceDTO> {
  const res = await api.get<OperatorPerformanceDTO>(
    `/v1/logistics-operators/${operatorId}/performance`,
  );
  return res.data;
}

export async function getOperatorActiveAssignments(
  operatorId: string,
): Promise<{ data: OperatorActiveAssignmentDTO[] }> {
  const res = await api.get<{ data: OperatorActiveAssignmentDTO[] }>(
    `/v1/logistics-operators/${operatorId}/active-assignments`,
  );
  return res.data;
}

export async function getOperatorsKpis(): Promise<OperatorsKpisDTO> {
  const res = await api.get<OperatorsKpisDTO>("/v1/logistics-operators/kpis");
  return res.data;
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function createOperator(
  body: CreateLogisticsOperatorBody,
): Promise<LogisticsOperatorDTO> {
  const res = await api.post<LogisticsOperatorDTO>(
    "/v1/logistics-operators",
    body,
  );
  return res.data;
}

export interface PatchOperatorBody {
  full_name?: string;
  email?: string;
  phone?: string;
  document_id?: string;
  vehicle_type?: VehicleType;
  license_plate?: string;
  status?: OperatorStatus;
}

export async function patchOperator(
  operatorId: string,
  body: PatchOperatorBody,
): Promise<LogisticsOperatorDTO> {
  const res = await api.patch<LogisticsOperatorDTO>(
    `/v1/logistics-operators/${operatorId}`,
    body,
  );
  return res.data;
}
