import "dotenv/config";

import {
  PrismaClient,
  ServiceLevel,
} from "../src/generated/prisma/client";
import { distanceBetweenPostalCodes } from "../src/lib/geo/distance";

const prisma = new PrismaClient();

const BUYER_POSTAL_CODES = [
  "C1043",
  "C1426",
  "C1425",
  "C1042",
  "C1406",
  "C1006",
  "B1900",
  "X5000",
  "S2000",
  "B1629",
] as const;

const SELLER_POSTAL_CODES = [
  "C1406",
  "C1043",
  "B1900",
  "X5000",
  "S2000",
  "M5500",
  "B1642",
  "B1878",
  "B7600",
  "B2800",
] as const;

async function main(): Promise<void> {
  const serviceLevels = [ServiceLevel.standard, ServiceLevel.express];
  const rates = await prisma.shippingRate.findMany({
    where: {
      active: true,
      serviceLevel: { in: serviceLevels },
    },
  });

  let checked = 0;
  for (const buyerPostalCode of BUYER_POSTAL_CODES) {
    for (const sellerPostalCode of SELLER_POSTAL_CODES) {
      const distanceKm = distanceBetweenPostalCodes(
        sellerPostalCode,
        buyerPostalCode,
      );
      if (distanceKm === null) {
        throw new Error(
          `Código postal desconocido: ${sellerPostalCode} -> ${buyerPostalCode}`,
        );
      }

      for (const serviceLevel of serviceLevels) {
        const matchingRate = rates.find(
          (rate) =>
            rate.serviceLevel === serviceLevel &&
            rate.distanceKmMin <= distanceKm &&
            rate.distanceKmMax >= distanceKm &&
            rate.weightGramsMin <= 15_000 &&
            rate.weightGramsMax >= 15_000,
        );
        if (!matchingRate) {
          throw new Error(
            `Sin tarifa: ${sellerPostalCode} -> ${buyerPostalCode}, ${distanceKm} km, ${serviceLevel}`,
          );
        }
        checked += 1;
      }
    }
  }

  console.log(`Combinaciones tarifarias verificadas: ${checked}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
