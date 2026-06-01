/**
 * Vincula tu user real de Clerk a un operador seedeado, para que el dashboard
 * del operador (/dashboard/assignments) muestre los envíos asignados a ese
 * operador como si fueras vos.
 *
 * Uso:
 *   npx tsx scripts/link-operator.ts <clerk_user_id> [operator_full_name]
 *
 * Ej:
 *   npx tsx scripts/link-operator.ts user_2nKxYz7vQp
 *   npx tsx scripts/link-operator.ts user_2nKxYz7vQp "María González"
 *
 * Si no pasás nombre, vincula a "Juan Pérez" por default (tiene 5 envíos
 * activos asignados, ideal para probar todo el flujo).
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , clerkUserId, operatorName = "Shipp Operator 1"] = process.argv;

  if (!clerkUserId || !clerkUserId.startsWith("user_")) {
    console.error("❌ Falta el clerk_user_id (debe empezar con 'user_').");
    console.error("\nUso:");
    console.error("  npx tsx scripts/link-operator.ts <clerk_user_id> [operator_full_name]");
    console.error("\nEj:");
    console.error("  npx tsx scripts/link-operator.ts user_2nKxYz7vQp");
    console.error("  npx tsx scripts/link-operator.ts user_2nKxYz7vQp \"María González\"");
    process.exit(1);
  }

  const operator = await prisma.logisticsOperator.findFirst({
    where: { fullName: operatorName },
  });

  if (!operator) {
    console.error(`❌ No encontré un operador llamado "${operatorName}".`);
    console.error("\nOperadores seedeados disponibles:");
    const all = await prisma.logisticsOperator.findMany({
      select: { fullName: true, status: true, vehicleType: true },
    });
    for (const op of all) {
      console.error(`  - ${op.fullName} (${op.vehicleType}, ${op.status})`);
    }
    process.exit(1);
  }

  // Verificar que el clerk_user_id no esté ya en uso por otro operador
  const existing = await prisma.logisticsOperator.findUnique({
    where: { clerkUserId },
  });
  if (existing && existing.id !== operator.id) {
    console.error(
      `⚠️  Ese clerk_user_id ya está vinculado a "${existing.fullName}". Liberándolo primero.`,
    );
    // Volverlo a su seed para no romper unique constraint
    await prisma.logisticsOperator.update({
      where: { id: existing.id },
      data: {
        clerkUserId: `user_seed_${existing.fullName.toLowerCase().replace(/\s/g, "_").replace(/[^\w_]/g, "")}_reset_${Date.now()}`,
      },
    });
  }

  const oldClerkId = operator.clerkUserId;
  const updated = await prisma.logisticsOperator.update({
    where: { id: operator.id },
    data: { clerkUserId },
  });

  console.log("✅ Vinculación completa.\n");
  console.log(`Operador:       ${updated.fullName} (${updated.id})`);
  console.log(`Antes:          ${oldClerkId}`);
  console.log(`Ahora:          ${updated.clerkUserId}`);
  console.log("\nReload de /dashboard/assignments y vas a ver los envíos del operador.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
