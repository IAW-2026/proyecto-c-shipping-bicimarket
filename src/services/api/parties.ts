// Service del dominio "parties" (vendedores/compradores conocidos por la app).
// Una función por endpoint. Sin try/catch — el error propaga al hook.

import { api } from "@/lib/axios";
import type { AdminPartiesDTO } from "@/types/admin-parties";

export async function getAdminParties(): Promise<AdminPartiesDTO> {
  const res = await api.get<AdminPartiesDTO>("/v1/admin/parties");
  return res.data;
}
