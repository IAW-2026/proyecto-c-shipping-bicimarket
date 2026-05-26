import { api } from "@/lib/axios";
import type { PaginatedResponse } from "@/types/common";
import type {
  AssignmentDTO,
  CreateAssignmentBody,
  PatchAssignmentBody,
  ShipmentAssignmentDTO,
} from "@/types/assignments";

export async function listShipmentAssignments(
  shipmentId: string,
): Promise<{ data: ShipmentAssignmentDTO[] }> {
  const res = await api.get<{ data: ShipmentAssignmentDTO[] }>(
    `/v1/shipments/${shipmentId}/assignments`,
  );
  return res.data;
}

export async function getMyAssignments(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<AssignmentDTO>> {
  const res = await api.get<PaginatedResponse<AssignmentDTO>>(
    `/v1/my/assignments?page=${page}&limit=${limit}`,
  );
  return res.data;
}

export async function createAssignment(
  shipmentId: string,
  body: CreateAssignmentBody,
) {
  const res = await api.post(
    `/v1/shipments/${shipmentId}/assignments`,
    body,
  );
  return res.data;
}

export async function patchAssignment(
  shipmentId: string,
  assignmentId: string,
  body: PatchAssignmentBody,
) {
  const res = await api.patch(
    `/v1/shipments/${shipmentId}/assignments/${assignmentId}`,
    body,
  );
  return res.data;
}
