import { api } from "@/lib/axios";
import type { PublicTrackingDTO } from "@/types/public-tracking";

export async function getPublicTracking(
  code: string,
): Promise<PublicTrackingDTO> {
  const res = await api.get<PublicTrackingDTO>(
    `/v1/track/${encodeURIComponent(code)}`,
  );
  return res.data;
}
