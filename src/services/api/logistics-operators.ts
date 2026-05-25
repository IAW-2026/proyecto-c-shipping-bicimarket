import { api } from "@/lib/axios";
import type { PaginatedResponse } from "@/types/common";
import type {
  LogisticsOperatorDTO,
  CreateLogisticsOperatorBody,
} from "@/types/logistics-operators";

export async function listOperators(
  page = 1,
  perPage = 20,
): Promise<PaginatedResponse<LogisticsOperatorDTO>> {
  const res = await api.get<PaginatedResponse<LogisticsOperatorDTO>>(
    `/v1/logistics-operators?page=${page}&per_page=${perPage}`,
  );
  return res.data;
}

export async function createOperator(
  body: CreateLogisticsOperatorBody,
): Promise<LogisticsOperatorDTO> {
  const res = await api.post<LogisticsOperatorDTO>(
    "/v1/logistics-operators",
    body,
  );
  return res.data;
}
