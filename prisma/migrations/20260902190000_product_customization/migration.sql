-- Existing products retain their legacy presets until explicitly edited.
ALTER TABLE "MenuItem" ADD COLUMN "customizationOptions" TEXT;
