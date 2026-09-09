-- Keep the existing payment states and admit the states written by the refund API.
-- No order, payment ledger entry, or historical amount is rewritten.
BEGIN;

ALTER TABLE "CustomerOrder"
  DROP CONSTRAINT "CustomerOrder_paymentStatus_check",
  ADD CONSTRAINT "CustomerOrder_paymentStatus_check"
    CHECK ("paymentStatus" IN ('PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'));

COMMIT;
