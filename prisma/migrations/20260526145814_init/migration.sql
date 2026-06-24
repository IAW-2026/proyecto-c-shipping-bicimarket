-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('motorcycle', 'car', 'van', 'truck');

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "ServiceLevel" AS ENUM ('standard', 'express', 'same_day');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('created', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned');

-- CreateEnum
CREATE TYPE "TrackingEventType" AS ENUM ('created', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('assigned', 'accepted', 'picked_up', 'delivered', 'reassigned', 'cancelled');

-- CreateEnum
CREATE TYPE "StatusHistorySource" AS ENUM ('logistics', 'admin', 'system');

-- CreateTable
CREATE TABLE "logistics_operators" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "license_plate" TEXT NOT NULL,
    "status" "OperatorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "logistics_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service_level" "ServiceLevel" NOT NULL,
    "from_postal_prefix" TEXT NOT NULL,
    "to_postal_prefix" TEXT NOT NULL,
    "weight_grams_min" INTEGER NOT NULL,
    "weight_grams_max" INTEGER NOT NULL,
    "cost_cents" INTEGER NOT NULL,
    "estimated_days_min" INTEGER NOT NULL,
    "estimated_days_max" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_quotes" (
    "id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "from_address_snapshot" JSONB NOT NULL,
    "to_address_snapshot" JSONB NOT NULL,
    "service_level" "ServiceLevel" NOT NULL,
    "carrier" TEXT NOT NULL,
    "cost_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "weight_grams_total" INTEGER NOT NULL,
    "packages_count" INTEGER NOT NULL,
    "packages_snapshot" JSONB NOT NULL,
    "estimated_days_min" INTEGER NOT NULL,
    "estimated_days_max" INTEGER NOT NULL,
    "idempotency_key" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_seller_group_id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "buyer_profile_id" TEXT NOT NULL,
    "shipping_quote_id" TEXT,
    "carrier" TEXT NOT NULL,
    "service_level" "ServiceLevel" NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "label_url" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'created',
    "weight_grams_total" INTEGER NOT NULL,
    "cost_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "shipping_address_snapshot" JSONB NOT NULL,
    "pickup_address_snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "weight_grams" INTEGER NOT NULL,
    "length_cm" INTEGER NOT NULL,
    "width_cm" INTEGER NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "description" TEXT,
    "label_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "event_type" "TrackingEventType" NOT NULL,
    "location" TEXT,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "operator_clerk_user_id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'assigned',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "proof_photo_url" TEXT NOT NULL,
    "signature_image_url" TEXT,
    "note" TEXT,
    "delivered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_status_history" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "from_status" "ShipmentStatus" NOT NULL,
    "to_status" "ShipmentStatus" NOT NULL,
    "source" "StatusHistorySource" NOT NULL,
    "payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistics_operators_clerk_user_id_key" ON "logistics_operators"("clerk_user_id");

-- CreateIndex
CREATE INDEX "logistics_operators_clerk_user_id_idx" ON "logistics_operators"("clerk_user_id");

-- CreateIndex
CREATE INDEX "logistics_operators_status_idx" ON "logistics_operators"("status");

-- CreateIndex
CREATE INDEX "shipping_rates_active_service_level_idx" ON "shipping_rates"("active", "service_level");

-- CreateIndex
CREATE INDEX "shipping_rates_from_postal_prefix_to_postal_prefix_idx" ON "shipping_rates"("from_postal_prefix", "to_postal_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_quotes_idempotency_key_key" ON "shipping_quotes"("idempotency_key");

-- CreateIndex
CREATE INDEX "shipping_quotes_seller_profile_id_idx" ON "shipping_quotes"("seller_profile_id");

-- CreateIndex
CREATE INDEX "shipping_quotes_expires_at_idx" ON "shipping_quotes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_idempotency_key_key" ON "shipments"("idempotency_key");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_order_seller_group_id_idx" ON "shipments"("order_seller_group_id");

-- CreateIndex
CREATE INDEX "shipments_sales_order_id_idx" ON "shipments"("sales_order_id");

-- CreateIndex
CREATE INDEX "shipments_seller_profile_id_idx" ON "shipments"("seller_profile_id");

-- CreateIndex
CREATE INDEX "shipments_buyer_profile_id_idx" ON "shipments"("buyer_profile_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_created_at_idx" ON "shipments"("created_at");

-- CreateIndex
CREATE INDEX "packages_shipment_id_idx" ON "packages"("shipment_id");

-- CreateIndex
CREATE INDEX "tracking_events_shipment_id_occurred_at_idx" ON "tracking_events"("shipment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tracking_events_event_type_idx" ON "tracking_events"("event_type");

-- CreateIndex
CREATE INDEX "delivery_assignments_shipment_id_idx" ON "delivery_assignments"("shipment_id");

-- CreateIndex
CREATE INDEX "delivery_assignments_operator_clerk_user_id_status_idx" ON "delivery_assignments"("operator_clerk_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_shipment_id_key" ON "delivery_proofs"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_status_history_shipment_id_occurred_at_idx" ON "shipment_status_history"("shipment_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_quote_id_fkey" FOREIGN KEY ("shipping_quote_id") REFERENCES "shipping_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_operator_clerk_user_id_fkey" FOREIGN KEY ("operator_clerk_user_id") REFERENCES "logistics_operators"("clerk_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_status_history" ADD CONSTRAINT "shipment_status_history_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
