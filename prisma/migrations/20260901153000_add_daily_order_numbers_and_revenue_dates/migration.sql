ALTER TABLE "CustomerOrder"
ADD COLUMN "dailyNumber" INTEGER,
ADD COLUMN "businessDate" VARCHAR(10),
ADD COLUMN "paidAt" TIMESTAMP(3);

UPDATE "CustomerOrder"
SET "businessDate" = to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

WITH numbered_orders AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "businessDate" ORDER BY "createdAt", "id")::INTEGER AS "number"
  FROM "CustomerOrder"
)
UPDATE "CustomerOrder" AS orders
SET "dailyNumber" = numbered_orders."number"
FROM numbered_orders
WHERE orders."id" = numbered_orders."id";

UPDATE "CustomerOrder"
SET "paidAt" = "updatedAt"
WHERE "paymentStatus" = 'PAID';

ALTER TABLE "CustomerOrder"
ALTER COLUMN "dailyNumber" SET NOT NULL,
ALTER COLUMN "businessDate" SET NOT NULL;

ALTER TABLE "CustomerOrder"
ADD CONSTRAINT "CustomerOrder_dailyNumber_check" CHECK ("dailyNumber" > 0),
ADD CONSTRAINT "CustomerOrder_businessDate_check" CHECK ("businessDate" ~ '^\d{4}-\d{2}-\d{2}$');

CREATE TABLE "DailyOrderCounter" (
  "businessDate" VARCHAR(10) NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyOrderCounter_pkey" PRIMARY KEY ("businessDate"),
  CONSTRAINT "DailyOrderCounter_lastNumber_check" CHECK ("lastNumber" >= 0)
);

INSERT INTO "DailyOrderCounter" ("businessDate", "lastNumber", "updatedAt")
SELECT "businessDate", MAX("dailyNumber"), CURRENT_TIMESTAMP
FROM "CustomerOrder"
GROUP BY "businessDate";

CREATE UNIQUE INDEX "CustomerOrder_businessDate_dailyNumber_key" ON "CustomerOrder"("businessDate", "dailyNumber");
CREATE INDEX "CustomerOrder_paymentStatus_paidAt_idx" ON "CustomerOrder"("paymentStatus", "paidAt");
