/*
  Warnings:

  - You are about to drop the column `from_postal_prefix` on the `shipping_rates` table. All the data in the column will be lost.
  - You are about to drop the column `to_postal_prefix` on the `shipping_rates` table. All the data in the column will be lost.
  - Added the required column `distance_km_max` to the `shipping_rates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distance_km_min` to the `shipping_rates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "shipping_rates_from_postal_prefix_to_postal_prefix_idx";

-- AlterTable
ALTER TABLE "shipping_rates" DROP COLUMN "from_postal_prefix",
DROP COLUMN "to_postal_prefix",
ADD COLUMN     "distance_km_max" INTEGER NOT NULL,
ADD COLUMN     "distance_km_min" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "shipping_rates_distance_km_min_distance_km_max_idx" ON "shipping_rates"("distance_km_min", "distance_km_max");
