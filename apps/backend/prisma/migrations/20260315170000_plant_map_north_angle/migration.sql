ALTER TABLE "PlantMap"
ADD COLUMN "northAngleDeg" DOUBLE PRECISION;

UPDATE "PlantMap"
SET "northAngleDeg" = ("sunPathAngleDeg" + 270.0)
	- FLOOR(("sunPathAngleDeg" + 270.0) / 360.0) * 360.0;

UPDATE "PlantMap"
SET "northAngleDeg" = 270
WHERE "northAngleDeg" IS NULL;

ALTER TABLE "PlantMap"
ALTER COLUMN "northAngleDeg" SET DEFAULT 270,
ALTER COLUMN "northAngleDeg" SET NOT NULL;