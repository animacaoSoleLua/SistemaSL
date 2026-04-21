-- Make title_schedule required: fill NULLs then set NOT NULL
UPDATE "reports" SET "title_schedule" = 'Nao informado' WHERE "title_schedule" IS NULL;
ALTER TABLE "reports" ALTER COLUMN "title_schedule" SET NOT NULL;

-- Add optional birthday_age column
ALTER TABLE "reports" ADD COLUMN "birthday_age" INTEGER;
