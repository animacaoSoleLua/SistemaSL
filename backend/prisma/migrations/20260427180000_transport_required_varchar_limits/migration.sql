-- Set NULL transport_type to default before making column NOT NULL
UPDATE "reports" SET "transport_type" = 'uber99' WHERE "transport_type" IS NULL;

-- AlterTable: transport_type NOT NULL, expand varchar limits
ALTER TABLE "reports"
  ALTER COLUMN "transport_type" SET NOT NULL,
  ALTER COLUMN "contractor_name" TYPE VARCHAR(250),
  ALTER COLUMN "title_schedule" TYPE VARCHAR(300);
