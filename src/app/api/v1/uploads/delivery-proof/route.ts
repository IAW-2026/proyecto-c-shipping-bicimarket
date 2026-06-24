// POST /api/v1/uploads/delivery-proof — sube una foto al bucket
// `delivery-proofs` de Supabase Storage y devuelve la URL pública.
//
// Auth: JWT logistics (operador activo).
// Body: multipart/form-data con un campo `file`.
//
// El cliente sube ACÁ primero, recibe la URL, y después manda esa URL al
// endpoint /shipments/{id}/deliver como `proof_photo_url`. Esto desacopla
// el upload del proceso de entrega (más simple, más rápido, sin payloads
// gigantes en JSON).

import { NextRequest, NextResponse } from "next/server";
import { getActiveOperator } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { uploadDeliveryProof } from "@/lib/supabase-storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const operator = await getActiveOperator();
    if (!operator) {
      throw new ApiError("FORBIDDEN", 403, "Operador activo requerido");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      throw new ApiError("BAD_REQUEST", 400, "Falta el campo `file`");
    }
    if (file.size === 0) {
      throw new ApiError("BAD_REQUEST", 400, "Archivo vacío");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(
        "FILE_TOO_LARGE",
        413,
        `Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)`,
      );
    }

    const contentType = file.type || "image/jpeg";
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new ApiError(
        "INVALID_FILE_TYPE",
        415,
        `Tipo no soportado: ${contentType}. Aceptamos: ${ALLOWED_TYPES.join(", ")}`,
      );
    }

    const url = await uploadDeliveryProof(file, contentType);

    return NextResponse.json({ url, content_type: contentType, size: file.size });
  } catch (err) {
    return handleApiError(err);
  }
}
