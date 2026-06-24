import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { AR_POSTAL_CODES } from "../src/lib/geo/ar-postal-codes";
import { seedShipping2 } from "../seeds/seed-shipping-2";
import { seedShipping } from "../seeds/seed-shipping";
import {
  seedLogisticsOperators,
  rollupSeedStatuses,
} from "../seeds/shipping-dataset";
import { seedRates } from "./seed-rates";

const prisma = new PrismaClient();

const REQUIRED_POSTAL_CODES = [
  "B1629",
  "B1642",
  "B1878",
  "B1900",
  "B2800",
  "B7600",
  "C1006",
  "C1042",
  "C1043",
  "C1406",
  "C1425",
  "C1426",
  "M5500",
  "S2000",
  "X5000",
] as const;

function validatePostalCoverage(): void {
  const missing = REQUIRED_POSTAL_CODES.filter(
    (postalCode) => !AR_POSTAL_CODES[postalCode],
  );
  if (missing.length > 0) {
    throw new Error(
      `Faltan códigos postales exactos requeridos por Buyer/Seller: ${missing.join(", ")}`,
    );
  }
}

async function clearDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.deliveryAssignment.deleteMany(),
    prisma.deliveryProof.deleteMany(),
    prisma.shipmentStatusHistory.deleteMany(),
    prisma.trackingEvent.deleteMany(),
    prisma.package.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.shipmentGroup.deleteMany(),
    prisma.shippingQuote.deleteMany(),
    prisma.shippingRate.deleteMany(),
    prisma.logisticsOperator.deleteMany(),
  ]);
}

async function verifySeed(): Promise<void> {
  const [
    rates,
    operators,
    groups,
    quotes,
    shipments,
    assignments,
    proofs,
    events,
    history,
  ] = await Promise.all([
    prisma.shippingRate.count(),
    prisma.logisticsOperator.count(),
    prisma.shipmentGroup.count(),
    prisma.shippingQuote.count(),
    prisma.shipment.count(),
    prisma.deliveryAssignment.count(),
    prisma.deliveryProof.count(),
    prisma.trackingEvent.count(),
    prisma.shipmentStatusHistory.count(),
  ]);

  const actual = {
    rates,
    operators,
    groups,
    quotes,
    shipments,
    assignments,
    proofs,
    events,
    history,
  };
  const expected = {
    rates: 150,
    operators: 8,
    groups: 60,
    quotes: 76,
    shipments: 76,
    assignments: 60,
    proofs: 20,
    events: 302,
    history: 226,
  };

  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (actual[key] !== expected[key]) {
      throw new Error(
        `Conteo inválido para ${key}: esperado ${expected[key]}, obtenido ${actual[key]}`,
      );
    }
  }

  const orphanedQuotes = await prisma.shipment.count({
    where: { shippingQuoteId: null },
  });
  const legacyAssignments = await prisma.deliveryAssignment.count({
    where: { shipmentGroupId: null },
  });
  if (orphanedQuotes > 0 || legacyAssignments > 0) {
    throw new Error(
      `Relaciones incompletas: shipments sin quote=${orphanedQuotes}, assignments sin grupo=${legacyAssignments}`,
    );
  }

  const seededGroups = await prisma.shipmentGroup.findMany({
    include: {
      shipments: { select: { status: true } },
      assignments: {
        select: { operatorClerkUserId: true },
      },
    },
  });
  for (const group of seededGroups) {
    const rolled = rollupSeedStatuses(
      group.shipments.map((shipment) => shipment.status),
    );
    if (group.status !== rolled) {
      throw new Error(
        `Rollup inválido en ${group.id}: esperado ${rolled}, obtenido ${group.status}`,
      );
    }
    if (
      group.assignments.length !== 1 ||
      group.assignments[0].operatorClerkUserId !==
        group.assignedOperatorClerkUserId
    ) {
      throw new Error(`Asignación grupal inconsistente en ${group.id}`);
    }
  }

  console.log("Seed verificado:", actual);
}

async function main(): Promise<void> {
  console.log("Validando cobertura postal multi-app...");
  validatePostalCoverage();

  console.log("Limpiando la base de Shipping...");
  await clearDatabase();

  console.log("Cargando tarifaria canónica...");
  await seedRates(prisma);

  console.log("Cargando operadores ficticios compartidos...");
  await seedLogisticsOperators(prisma);

  console.log("Cargando dataset Shipping 1...");
  await seedShipping(prisma);

  console.log("Cargando dataset Shipping 2...");
  await seedShipping2(prisma);

  await verifySeed();
}

main()
  .catch((error) => {
    console.error("Seed de Shipping falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
