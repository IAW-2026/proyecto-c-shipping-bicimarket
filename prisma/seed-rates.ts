import "dotenv/config";
import {
  PrismaClient,
  ServiceLevel,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const distanceBands = [
  { min: 0, max: 10, baseCostCents: 250_000 },
  { min: 11, max: 50, baseCostCents: 350_000 },
  { min: 51, max: 150, baseCostCents: 500_000 },
  { min: 151, max: 500, baseCostCents: 750_000 },
  { min: 501, max: 999_999, baseCostCents: 1_200_000 },
] as const;

// Todos los limites de peso estan expresados en gramos.
const weightBands = [
  { min: 0, max: 500, multiplier: 0.7 },
  { min: 501, max: 1_000, multiplier: 0.85 },
  { min: 1_001, max: 2_000, multiplier: 1 },
  { min: 2_001, max: 5_000, multiplier: 1.35 },
  { min: 5_001, max: 10_000, multiplier: 1.8 },
  { min: 10_001, max: 20_000, multiplier: 2.5 },
  { min: 20_001, max: 50_000, multiplier: 3.5 },
  { min: 50_001, max: 100_000, multiplier: 5 },
  { min: 100_001, max: 150_000, multiplier: 7.5 },
  { min: 150_001, max: 200_000, multiplier: 10 },
] as const;

const services = [
  {
    level: ServiceLevel.standard,
    carrier: "andreani",
    multiplier: 1,
    daysMin: 3,
    daysMax: 5,
  },
  {
    level: ServiceLevel.express,
    carrier: "andreani",
    multiplier: 1.6,
    daysMin: 1,
    daysMax: 2,
  },
  {
    level: ServiceLevel.same_day,
    carrier: "propio",
    multiplier: 2.4,
    daysMin: 0,
    daysMax: 0,
  },
] as const;

const rates = weightBands.flatMap((weight) =>
  distanceBands.flatMap((distance) =>
    services.map((service) => ({
      id: [
        "rat_seed",
        distance.min,
        distance.max,
        weight.min,
        weight.max,
        service.level,
      ].join("_"),
      carrier: service.carrier,
      serviceLevel: service.level,
      distanceKmMin: distance.min,
      distanceKmMax: distance.max,
      weightGramsMin: weight.min,
      weightGramsMax: weight.max,
      costCents: Math.round(
        distance.baseCostCents * weight.multiplier * service.multiplier,
      ),
      estimatedDaysMin: service.daysMin,
      estimatedDaysMax: service.daysMax,
      active:
        service.level !== ServiceLevel.same_day || distance.max <= 150,
    })),
  ),
);

async function main() {
  await prisma.$transaction(
    rates.map((rate) =>
      prisma.shippingRate.upsert({
        where: { id: rate.id },
        update: rate,
        create: rate,
      }),
    ),
  );

  console.log(
    `Tarifas actualizadas: ${rates.length} filas, cobertura de 0 a 200000 gramos.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
