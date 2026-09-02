-- Null custody preserves uncertainty about cash collected before this release.
ALTER TABLE "PaymentEvent" ADD COLUMN "cashCustody" TEXT;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_cashCustody_check"
  CHECK ("cashCustody" IS NULL OR "cashCustody" IN ('REGISTER', 'DRIVER'));
ALTER TABLE "CustomerOrder" ADD COLUMN "deliveryIssue" TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "CustomerOrder" DROP CONSTRAINT "CustomerOrder_deliveryStatus_check";
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_deliveryStatus_check" CHECK ("deliveryStatus" IN ('PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'));
CREATE TABLE "DriverCashHandover" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentEventId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "driverName" TEXT NOT NULL,
  "receivedById" TEXT NOT NULL,
  "receivedByName" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverCashHandover_paymentEventId_fkey" FOREIGN KEY ("paymentEventId") REFERENCES "PaymentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DriverCashHandover_paymentEventId_key" ON "DriverCashHandover"("paymentEventId");
CREATE INDEX "DriverCashHandover_driverId_createdAt_idx" ON "DriverCashHandover"("driverId", "createdAt");
CREATE INDEX "PaymentEvent_cashCustody_shiftId_idx" ON "PaymentEvent"("cashCustody", "shiftId");
