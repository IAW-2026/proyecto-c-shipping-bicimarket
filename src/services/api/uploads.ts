import { api } from "@/lib/axios";

export interface UploadDeliveryProofResponse {
  url: string;
  content_type: string;
  size: number;
}

/**
 * Sube una foto de prueba de entrega al storage. Devuelve la URL pública
 * que después va al endpoint /shipments/{id}/deliver.
 */
export async function uploadDeliveryProof(
  file: File | Blob,
): Promise<UploadDeliveryProofResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<UploadDeliveryProofResponse>(
    "/v1/uploads/delivery-proof",
    form,
    {
      // Axios respeta el Content-Type multipart con boundary autogenerado
      // si pasamos undefined; no hardcodearlo.
      headers: { "Content-Type": undefined },
    },
  );
  return res.data;
}
