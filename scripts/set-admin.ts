/**
 * Marca al usuario admin de corrección como admin de Shipping seteando
 * `publicMetadata.admin = true` en Clerk vía Backend API.
 *
 * Por qué hace falta: el rol admin NO vive en la DB, se reconoce por ese flag
 * en Clerk (ver src/lib/auth-helpers.ts → isAdmin / isAdminAsync). Sin esto, con
 * AUTO_PROVISION_OPERATORS=true el admin sería auto-creado como operador y
 * ruteado al dashboard de operador en lugar de /admin.
 *
 * Uso:
 *   npm run set-admin                 (usa el admin de corrección por default)
 *   npx tsx scripts/set-admin.ts user_otroId   (otro usuario)
 *
 * Requiere CLERK_SECRET_KEY en .env (apuntando a la instancia de Clerk correcta).
 */

import "dotenv/config";
import { clerkClient } from "@clerk/nextjs/server";

const DEFAULT_ADMIN_USER_ID = "user_3EXPeawZ7uS0qMoJKXBh2Y7KAez"; // shippadminclerktest@iaw.com

async function main() {
  const userId = process.argv[2] ?? DEFAULT_ADMIN_USER_ID;

  if (!userId.startsWith("user_")) {
    console.error("❌ El clerk_user_id debe empezar con 'user_'.");
    process.exit(1);
  }
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("❌ Falta CLERK_SECRET_KEY en el entorno (.env).");
    process.exit(1);
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { admin: true },
  });

  console.log(`✅ publicMetadata.admin=true seteado para ${userId}.`);
  console.log("   Volvé a loguearte como admin para que el JWT tome el cambio.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
