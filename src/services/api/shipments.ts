// Services del dominio "shipments". Una función por endpoint. Sin try/catch.
// El error propaga al hook y React Query / useApiMutation lo manejan.

import { api } from "@/lib/axios";
import type { PaginatedResponse } from "@/types/common";
import type {
  ShipmentDTO,
  ShipmentsAdminFilters,
  PatchShipmentStatusBody,
} from "@/types/shipments";
import type {
  CreateTrackingEventBody,
  DeliverShipmentBody,
  DeliverShipmentResponse,
  TrackingEventDTO,
} from "@/types/tracking-events";
import type { ShipmentStatusHistoryDTO } from "@/types/shipment-status-history";
import type { ShipmentsKpisDTO } from "@/types/admin-kpis";
import type { CreateAdminShipmentBody } from "@/types/admin-shipments";

// ── GETs ───────────────────────────────────────────────────────────────────

export async function getShipment(shipmentId: string): Promise<ShipmentDTO> {
  const res = await api.get<ShipmentDTO>(`/v1/shipments/${shipmentId}`);
  return res.data;
}

export async function listShipmentsAdmin(
  filters: ShipmentsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<PaginatedResponse<ShipmentDTO>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: sortBy,
    sort_dir: sortDir,
  });

  if (filters.tracking_number) params.set("tracking_number", filters.tracking_number);
  if (filters.seller_profile_id) params.set("seller_profile_id", filters.seller_profile_id);
  if (filters.status?.length) {
    for (const s of filters.status) params.append("status[]", s);
  }
  if (filters.created_at_from) params.set("created_at_from", filters.created_at_from);
  if (filters.created_at_to) params.set("created_at_to", filters.created_at_to);

  const res = await api.get<PaginatedResponse<ShipmentDTO>>(
    `/v1/shipments?${params.toString()}`,
  );
  return res.data;
}

export async function listShipmentsByOrder(
  orderId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<ShipmentDTO>> {
  const res = await api.get<PaginatedResponse<ShipmentDTO>>(
    `/v1/shipments?orderId=${encodeURIComponent(orderId)}&page=${page}&limit=${limit}`,
  );
  return res.data;
}

export async function listTrackingEvents(
  shipmentId: string,
  page = 1,
  limit = 50,
): Promise<PaginatedResponse<TrackingEventDTO>> {
  const res = await api.get<PaginatedResponse<TrackingEventDTO>>(
    `/v1/shipments/${shipmentId}/tracking-events?page=${page}&limit=${limit}`,
  );
  return res.data;
}

export async function getShipmentStatusHistory(
  shipmentId: string,
): Promise<{ data: ShipmentStatusHistoryDTO[] }> {
  const res = await api.get<{ data: ShipmentStatusHistoryDTO[] }>(
    `/v1/shipments/${shipmentId}/status-history`,
  );
  return res.data;
}

export async function getShipmentsKpis(): Promise<ShipmentsKpisDTO> {
  const res = await api.get<ShipmentsKpisDTO>("/v1/shipments/kpis");
  return res.data;
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function patchShipmentStatus(
  shipmentId: string,
  body: PatchShipmentStatusBody,
): Promise<ShipmentDTO> {
  const res = await api.patch<ShipmentDTO>(`/v1/shipments/${shipmentId}`, body);
  return res.data;
}

export async function addTrackingEvent(
  shipmentId: string,
  body: CreateTrackingEventBody,
): Promise<TrackingEventDTO> {
  const res = await api.post<TrackingEventDTO>(
    `/v1/shipments/${shipmentId}/tracking-events`,
    body,
  );
  return res.data;
}

export async function deliverShipment(
  shipmentId: string,
  body: DeliverShipmentBody,
): Promise<DeliverShipmentResponse> {
  const res = await api.post<DeliverShipmentResponse>(
    `/v1/shipments/${shipmentId}/deliver`,
    body,
  );
  return res.data;
}

/** Dev-only: crea quote + shipment + packages en una transacción. */
export async function createAdminShipment(
  body: CreateAdminShipmentBody,
): Promise<ShipmentDTO> {
  const res = await api.post<ShipmentDTO>("/v1/admin/shipments", body);
  return res.data;
}

/**
 * Reintenta un envío fallido creando uno nuevo con los mismos datos.
 * El original pasa a `returned` y el nuevo arranca en `ready_for_pickup`.
 */
export async function retryShipment(shipmentId: string): Promise<ShipmentDTO> {
  const res = await api.post<ShipmentDTO>(
    `/v1/shipments/${shipmentId}/retry`,
    {},
  );
  return res.data;
}
