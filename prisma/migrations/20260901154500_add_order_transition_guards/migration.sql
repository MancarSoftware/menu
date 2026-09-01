CREATE OR REPLACE FUNCTION "assignDailyOrderNumber"()
RETURNS TRIGGER AS $$
DECLARE
  assigned_date VARCHAR(10);
  assigned_number INTEGER;
BEGIN
  IF NEW."businessDate" IS NULL OR NEW."dailyNumber" IS NULL THEN
    assigned_date := COALESCE(
      NEW."businessDate",
      to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD')
    );

    INSERT INTO "DailyOrderCounter" ("businessDate", "lastNumber", "updatedAt")
    VALUES (assigned_date, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("businessDate") DO UPDATE
    SET
      "lastNumber" = "DailyOrderCounter"."lastNumber" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "lastNumber" INTO assigned_number;

    NEW."businessDate" := assigned_date;
    NEW."dailyNumber" := assigned_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CustomerOrder_assignDailyOrderNumber"
BEFORE INSERT ON "CustomerOrder"
FOR EACH ROW
EXECUTE FUNCTION "assignDailyOrderNumber"();

CREATE OR REPLACE FUNCTION "recordOrderPaidAt"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."paymentStatus" = 'PAID' AND NEW."paidAt" IS NULL THEN
    NEW."paidAt" := CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CustomerOrder_recordPaidAt"
BEFORE INSERT OR UPDATE OF "paymentStatus" ON "CustomerOrder"
FOR EACH ROW
EXECUTE FUNCTION "recordOrderPaidAt"();
