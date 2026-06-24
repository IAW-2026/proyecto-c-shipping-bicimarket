import type { PrismaClient } from "../src/generated/prisma/client";

import { seedShippingDataset } from "./shipping-dataset";

export function seedShipping2(prisma: PrismaClient): Promise<void> {
  return seedShippingDataset(prisma, 2);
}
