import { api } from "@/lib/axios";
import type {
  CreateShippingRateBody,
  ShippingRateDTO,
  UpdateShippingRateBody,
} from "@/types/shipping-rates";

export async function listShippingRates(): Promise<{ data: ShippingRateDTO[] }> {
  const res = await api.get<{ data: ShippingRateDTO[] }>("/v1/shipping-rates");
  return res.data;
}

export async function createShippingRate(
  body: CreateShippingRateBody,
): Promise<ShippingRateDTO> {
  const res = await api.post<ShippingRateDTO>("/v1/shipping-rates", body);
  return res.data;
}

export async function patchShippingRate(
  rateId: string,
  body: UpdateShippingRateBody,
): Promise<ShippingRateDTO> {
  const res = await api.patch<ShippingRateDTO>(
    `/v1/shipping-rates/${rateId}`,
    body,
  );
  return res.data;
}

export async function deleteShippingRate(rateId: string): Promise<void> {
  await api.delete(`/v1/shipping-rates/${rateId}`);
}
