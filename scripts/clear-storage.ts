/**
 * Vacía el bucket `delivery-proofs` de Supabase Storage (borra TODAS las fotos
 * de prueba de entrega subidas). Las pantallas usan la imagen de fallback
 * (/images.jpeg) cuando una foto no existe, así que borrar es seguro para
 * la corrección.
 *
 * Uso:
 *   npm run clear-storage
 *
 * ⚠️ Destructivo e irreversible. Requiere SUPABASE_URL + SUPABASE_SERVICE_KEY
 * en .env.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "delivery-proofs";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.");
    process.exit(1);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  let total = 0;
  // El bucket es plano (uuid.ext en la raíz). Listamos en tandas y borramos
  // hasta que no quede nada.
  for (;;) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list("", { limit: 100 });
    if (error) {
      console.error(`❌ Error listando el bucket: ${error.message}`);
      process.exit(1);
    }
    // Filtramos posibles "carpetas" (vienen con id null) por las dudas.
    const names = (data ?? [])
      .filter((f) => f.id !== null && f.name)
      .map((f) => f.name);
    if (names.length === 0) break;

    const { error: delErr } = await client.storage
      .from(BUCKET)
      .remove(names);
    if (delErr) {
      console.error(`❌ Error borrando archivos: ${delErr.message}`);
      process.exit(1);
    }
    total += names.length;
    console.log(`   borradas ${names.length} (acumulado ${total})…`);
  }

  console.log(
    total === 0
      ? `✅ El bucket "${BUCKET}" ya estaba vacío.`
      : `✅ Borradas ${total} imágenes del bucket "${BUCKET}".`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
