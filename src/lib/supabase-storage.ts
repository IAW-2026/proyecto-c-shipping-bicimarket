// Cliente server-side de Supabase Storage para guardar fotos de delivery.
// Decisión simplificadora: un único bucket público `delivery-proofs` sin RLS
// y sin signed URLs. Para sprint 1 alcanza — las fotos son evidencia de
// entrega, no datos sensibles. Los nombres son UUID random así no se pueden
// adivinar.
//
// Setup en Supabase Dashboard (una sola vez):
//   1. Storage → New bucket → nombre `delivery-proofs`, marcar "Public bucket"
//   2. Settings → API → copiar `service_role` key al .env

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "delivery-proofs";

let cached: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cached) return cached;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env (ver lib/supabase-storage.ts)",
    );
  }
  cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  return cached;
}

/**
 * Sube un archivo (Blob/Buffer) al bucket `delivery-proofs` y devuelve la
 * URL pública. Genera un path único con UUID + extensión inferida del
 * contentType (jpg/png/webp).
 */
export async function uploadDeliveryProof(
  body: Blob | ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const client = getClient();
  const ext = mimeToExt(contentType);
  const id = (globalThis.crypto ?? require("crypto"))
    .randomUUID()
    .replace(/-/g, "");
  const path = `${id}.${ext}`;

  const { error } = await client.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mimeToExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg"; // default — sirve para image/jpeg y unknowns
}
