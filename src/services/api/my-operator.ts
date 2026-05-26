import { api } from "@/lib/axios";
import type {
  LogisticsOperatorDTO,
  VehicleType,
} from "@/types/logistics-operators";

/**
 * Datos editables por el operador desde /dashboard/profile.
 * `full_name` y `email` quedan fuera — los administra Clerk.
 */
export interface UpdateMyOperatorBody {
  phone?: string;
  document_id?: string;
  vehicle_type?: VehicleType;
  license_plate?: string;
}

export async function getMyOperator(): Promise<LogisticsOperatorDTO> {
  const res = await api.get<LogisticsOperatorDTO>("/v1/my/operator");
  return res.data;
}

export async function patchMyOperator(
  body: UpdateMyOperatorBody,
): Promise<LogisticsOperatorDTO> {
  const res = await api.patch<LogisticsOperatorDTO>("/v1/my/operator", body);
  return res.data;
}
