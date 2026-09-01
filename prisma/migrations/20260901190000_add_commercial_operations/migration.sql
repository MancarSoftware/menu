-- Commercial operations for a single restaurant deployment.
ALTER TABLE "CustomerOrder"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "acknowledgedBy" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AdminUser"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE TABLE "CashRegisterShift" (
  "id" TEXT NOT NULL,
  "businessDate" VARCHAR(10) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openingBalanceCents" INTEGER NOT NULL,
  "expectedCashCents" INTEGER,
  "actualCashCents" INTEGER,
  "discrepancyCents" INTEGER,
  "notes" TEXT NOT NULL DEFAULT '',
  "openedByUserId" TEXT,
  "openedByName" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "closedByName" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashRegisterShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "shiftId" TEXT,
  "type" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "actorUserId" TEXT,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginThrottle" (
  "key" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "CustomerOrder_mode_createdAt_idx" ON "CustomerOrder"("mode", "createdAt");
CREATE INDEX "CustomerOrder_businessDate_paymentMethod_idx" ON "CustomerOrder"("businessDate", "paymentMethod");
CREATE INDEX "CashRegisterShift_businessDate_status_idx" ON "CashRegisterShift"("businessDate", "status");
CREATE INDEX "CashRegisterShift_status_openedAt_idx" ON "CashRegisterShift"("status", "openedAt");
CREATE UNIQUE INDEX "CashRegisterShift_one_open_idx" ON "CashRegisterShift"("status") WHERE "status" = 'OPEN';
CREATE INDEX "PaymentEvent_orderId_createdAt_idx" ON "PaymentEvent"("orderId", "createdAt");
CREATE INDEX "PaymentEvent_shiftId_method_createdAt_idx" ON "PaymentEvent"("shiftId", "method", "createdAt");
CREATE INDEX "PaymentEvent_type_createdAt_idx" ON "PaymentEvent"("type", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CashRegisterShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve existing paid sales in the new payment ledger.
INSERT INTO "PaymentEvent" (
  "id", "orderId", "type", "method", "amountCents", "reason", "actorName", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  'PAYMENT',
  COALESCE("paymentMethod", 'CASH'),
  "totalCents",
  'Migrated paid order',
  'SYSTEM',
  COALESCE("paidAt", "updatedAt")
FROM "CustomerOrder"
WHERE "paymentStatus" = 'PAID';
