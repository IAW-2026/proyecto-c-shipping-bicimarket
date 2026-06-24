import { api } from "@/lib/axios";
import type { ApiCallBody, ApiCallResult } from "@/types/api-explorer";

/**
 * Ejecuta una llamada a un endpoint S2S de Shipping a través del proxy
 * admin-only. El proxy inyecta el X-Service-Token del lado del servidor.
 */
export async function executeApiCall(
  payload: ApiCallBody,
): Promise<ApiCallResult> {
  const { data } = await api.post<ApiCallResult>(
    "/v1/admin/api-explorer",
    payload,
  );
  return data;
}
