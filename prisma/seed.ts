/**
 * Seed dev — Shipping App
 *
 * Corre con:
 *   npm run db:seed              (solo seedea, sin tocar el schema)
 *   npx prisma migrate reset     (drop + migrate + seed)
 *
 * Idempotente: vacía la tarifaría antes de re-insertarla. NUNCA correr
 * contra producción.
 *
 * Decisión actual: este seed SOLO crea `shipping_rates`. Los operadores
 * los crea Clerk (auto-provisioning al login, ver AUTO_PROVISION_OPERATORS
 * en .env) y los shipments se crean desde /admin/shipments/new.
 *
 * Si necesitás volver a tener data de prueba (operadores, envíos, tracking
 * events, etc), revivilo desde el historial de git.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { ServiceLevel } from "../src/generated/prisma/enums";

const prisma = new PrismaClient();

function generateId(prefix: string): string {
  const hex = (globalThis.crypto ?? require("crypto"))
    .randomUUID()
    .replace(/-/g, "");
  return `${prefix}_${hex.slice(0, 24)}`;
}

// ─── Tarifaría: 45 filas (5 distancias × 3 pesos × 3 services) ────────────

const RATES = (() => {
  // 5 rangos de distancia alineados con Andreani/OCA reales en Argentina
  const distances = [
    { min: 0, max: 10, label: "local" },
    { min: 10, max: 50, label: "metro" },
    { min: 50, max: 150, label: "regional" },
    { min: 150, max: 500, label: "nacional-medio" },
    { min: 500, max: 999_999, label: "nacional-largo" },
  ];

  const weights = [
    { min: 0, max: 2000, mul: 1 },           // hasta 2 kg
    { min: 2001, max: 10000, mul: 1.8 },     // 2-10 kg
    { min: 10001, max: 50000, mul: 3.5 },    // 10-50 kg
  ];

  // Costo base (en centavos) para 0-2kg + standard, por rango de distancia
  const baseStandard: Record<string, number> = {
    local: 250_000,              // $ 2.500
    metro: 350_000,              // $ 3.500
    regional: 500_000,           // $ 5.000
    "nacional-medio": 750_000,   // $ 7.500
    "nacional-largo": 1_200_000, // $ 12.000
  };

  const services: Array<{
    level: ServiceLevel;
    carrier: string;
    serviceMul: number;
    days: [number, number];
  }> = [
    { level: ServiceLevel.standard, carrier: "andreani", serviceMul: 1, days: [3, 5] },
    { level: ServiceLevel.express, carrier: "andreani", serviceMul: 1.6, days: [1, 2] },
    { level: ServiceLevel.same_day, carrier: "propio", serviceMul: 2.4, days: [0, 0] },
  ];

  const rows: Array<{
    id: string;
    carrier: string;
    serviceLevel: ServiceLevel;
    distanceKmMin: number;
    distanceKmMax: number;
    weightGramsMin: number;
    weightGramsMax: number;
    costCents: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    active: boolean;
  }> = [];

  for (const w of weights) {
    for (const d of distances) {
      for (const s of services) {
        // same_day no aplica para distancias > 150 km (no se promete entrega
        // el mismo día desde CABA a Córdoba). La seedeamos inactiva para que
        // el admin pueda activarla manualmente si tiene una operación especial.
        const sameDayOnLongDistance =
          s.level === ServiceLevel.same_day && d.min >= 150;

        const base = baseStandard[d.label] ?? 250_000;
        const cost = Math.round(base * w.mul * s.serviceMul);

        rows.push({
          id: generateId("rat"),
          carrier: s.carrier,
          serviceLevel: s.level,
          distanceKmMin: d.min,
          distanceKmMax: d.max,
          weightGramsMin: w.min,
          weightGramsMax: w.max,
          costCents: cost,
          estimatedDaysMin: s.days[0],
          estimatedDaysMax: s.days[1],
          active: !sameDayOnLongDistance,
        });
      }
    }
  }
  return rows;
})();

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Shipping App DB...\n");

  console.log("→ Limpiando shipping_rates anterior...");
  await prisma.shippingRate.deleteMany({});

  console.log(`→ Insertando ${RATES.length} shipping_rates...`);
  await prisma.shippingRate.createMany({ data: RATES });

  const active = RATES.filter((r) => r.active).length;
  const inactive = RATES.length - active;

  console.log("\n✅ Seed completo.\n");
  console.log("Resumen:");
  console.log(`  - ${RATES.length} shipping_rates (${active} activas, ${inactive} inactivas)`);
  console.log("  - Rangos km: 0-10 / 10-50 / 50-150 / 150-500 / 500+");
  console.log("  - Rangos peso: 0-2kg / 2-10kg / 10-50kg");
  console.log("  - Service levels: standard, express, same_day");
  console.log("");
  console.log("📝 NO seedeamos operadores ni envíos.");
  console.log("   - Operadores: se auto-provisionan al login con Clerk");
  console.log("     (AUTO_PROVISION_OPERATORS=true en .env).");
  console.log("   - Envíos: creálos manualmente desde /admin/shipments/new.");
  console.log("   - Para entrar como admin: setear publicMetadata.admin=true");
  console.log("     en tu user de Clerk Dashboard.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
