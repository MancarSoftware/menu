ALTER TABLE "AdminUser"
  ADD COLUMN "canCollectCard" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canCollectTransfer" BOOLEAN NOT NULL DEFAULT false;
