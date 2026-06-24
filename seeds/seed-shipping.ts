import type { PrismaClient } from "../src/generated/prisma/client";

import { seedShippingDataset } from "./shipping-dataset";

export function seedShipping(prisma: PrismaClient): Promise<void> {
  return seedShippingDataset(prisma, 1);
}
