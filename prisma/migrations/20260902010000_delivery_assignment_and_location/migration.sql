BEGIN;

ALTER TABLE "AdminUser" ADD COLUMN "canCollectCash" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" DROP CONSTRAINT IF EXISTS "AdminUser_role_check";
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_role_check"
  CHECK ("role" IN ('ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'DRIVER'));

ALTER TABLE "CustomerOrder"
  ADD COLUMN "deliveryLatitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryLongitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "assignedDriverId" TEXT,
  ADD COLUMN "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Keep legacy completed deliveries consistent; do not invent coordinates.
UPDATE "CustomerOrder" SET "deliveryStatus" = 'DELIVERED'
WHERE "mode" = 'DELIVERY' AND "status" IN ('SERVED', 'PAID');

ALTER TABLE "CustomerOrder"
  ADD CONSTRAINT "CustomerOrder_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CustomerOrder_deliveryStatus_check" CHECK ("deliveryStatus" IN ('PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED')),
  ADD CONSTRAINT "CustomerOrder_deliveryPoint_check" CHECK (
    ("deliveryLatitude" IS NULL AND "deliveryLongitude" IS NULL) OR
    ("mode" = 'DELIVERY' AND "deliveryLatitude" IS NOT NULL AND "deliveryLongitude" IS NOT NULL
      AND "deliveryLatitude" BETWEEN -90 AND 90 AND "deliveryLongitude" BETWEEN -180 AND 180)
  );
CREATE INDEX "CustomerOrder_assignedDriverId_deliveryStatus_idx" ON "CustomerOrder"("assignedDriverId", "deliveryStatus");

COMMIT;
