-- Keep existing dine-in orders valid while enabling the public checkout channels.
-- Replace the legacy guard atomically; unsupported order modes remain rejected.
ALTER TABLE "CustomerOrder"
  DROP CONSTRAINT IF EXISTS "CustomerOrder_mode_check",
  ADD CONSTRAINT "CustomerOrder_mode_check"
    CHECK ("mode" IN ('DINE_IN', 'DELIVERY', 'PICKUP'));
