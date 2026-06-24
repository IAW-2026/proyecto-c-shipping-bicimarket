import { api } from "@/lib/axios";
import { compressImage } from "@/lib/image-compression";

export interface UploadDeliveryProofResponse {
  url: string;
  content_type: string;
  size: number;
}

/**
 * Sube una foto de prueba de entrega al storage. Devuelve la URL pública
 * que después va al endpoint /shipments/{id}/deliver.
 *
 * Comprime la imagen en el navegador antes de subir (ver image-compression.ts):
 * las fotos de celular suelen pasar el límite de body de la plataforma y el
 * request se rechazaba. Tras comprimir queda muy por debajo del límite.
 */
export async function uploadDeliveryProof(
  file: File | Blob,
): Promise<UploadDeliveryProofResponse> {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("file", compressed, "delivery-proof.jpg");
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
