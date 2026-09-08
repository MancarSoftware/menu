-- Preserve historical phone values without interrupting kitchen/payment updates.
-- Text is intentional: telephone numbers are identifiers with leading zeros.
-- Validate every insert and any subsequent change to phone or order mode.
CREATE FUNCTION "validate_customer_order_phone"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."customerPhone" IS NOT DISTINCT FROM OLD."customerPhone"
       AND NEW."mode" IS NOT DISTINCT FROM OLD."mode" THEN
      RETURN NEW;
    END IF;
  END IF;

  IF (NEW."customerPhone" IS NULL AND NEW."mode" IN ('DELIVERY', 'PICKUP'))
     OR (NEW."customerPhone" IS NOT NULL AND
         (length(NEW."customerPhone") <> 10 OR NEW."customerPhone" !~ '^[0-9]{10}$')) THEN
    RAISE EXCEPTION 'El teléfono del cliente debe contener exactamente 10 dígitos.'
      USING ERRCODE = '23514', CONSTRAINT = 'CustomerOrder_customerPhone_ten_digits';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "customer_order_phone_guard"
BEFORE INSERT OR UPDATE OF "customerPhone", "mode" ON "CustomerOrder"
FOR EACH ROW EXECUTE FUNCTION "validate_customer_order_phone"();
