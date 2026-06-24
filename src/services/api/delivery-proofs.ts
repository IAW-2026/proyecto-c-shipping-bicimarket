import { api } from "@/lib/axios";
import type { DeliveryProofDTO } from "@/types/delivery-proofs";

export async function getDeliveryProof(
  shipmentId: string,
): Promise<DeliveryProofDTO> {
  const res = await api.get<DeliveryProofDTO>(
    `/v1/shipments/${shipmentId}/delivery-proof`,
  );
  return res.data;
}
