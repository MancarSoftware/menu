ALTER TABLE "Restaurant" ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Quito';
ALTER TABLE "Restaurant" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'EC';
ALTER TABLE "Restaurant" ADD COLUMN "latitude" DOUBLE PRECISION NOT NULL DEFAULT -0.220164;
ALTER TABLE "Restaurant" ADD COLUMN "longitude" DOUBLE PRECISION NOT NULL DEFAULT -78.512327;

ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_countryCode_check" CHECK ("countryCode" = 'EC');
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180);
