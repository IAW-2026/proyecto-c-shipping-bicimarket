/*
  Warnings:

  - You are about to drop the column `order_tracking_number` on the `shipments` table. All the data in the column will be lost.
  - Added the required column `shipment_group_id` to the `shipments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "shipments_order_tracking_number_idx";

-- AlterTable
ALTER TABLE "delivery_assignments" ADD COLUMN     "shipment_group_id" TEXT,
ALTER COLUMN "shipment_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "delivery_proofs" ALTER COLUMN "proof_photo_url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shipments" DROP COLUMN "order_tracking_number",
ADD COLUMN     "shipment_group_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "shipment_groups" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "buyer_profile_id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'created',
    "service_level" "ServiceLevel" NOT NULL,
    "shipping_address_snapshot" JSONB NOT NULL,
    "origins_count" INTEGER NOT NULL DEFAULT 0,
    "assigned_operator_clerk_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_groups_order_id_key" ON "shipment_groups"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_groups_tracking_number_key" ON "shipment_groups"("tracking_number");

-- CreateIndex
CREATE INDEX "shipment_groups_buyer_profile_id_idx" ON "shipment_groups"("buyer_profile_id");

-- CreateIndex
CREATE INDEX "shipment_groups_status_idx" ON "shipment_groups"("status");

-- CreateIndex
CREATE INDEX "delivery_assignments_shipment_group_id_status_idx" ON "delivery_assignments"("shipment_group_id", "status");

-- CreateIndex
CREATE INDEX "shipments_shipment_group_id_idx" ON "shipments"("shipment_group_id");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipment_group_id_fkey" FOREIGN KEY ("shipment_group_id") REFERENCES "shipment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_shipment_group_id_fkey" FOREIGN KEY ("shipment_group_id") REFERENCES "shipment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
