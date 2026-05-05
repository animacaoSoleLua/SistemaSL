ALTER TABLE "reports" ALTER COLUMN "birthday_age" TYPE VARCHAR(100) USING "birthday_age"::TEXT;
ALTER TABLE "reports" ALTER COLUMN "extra_hours_details" TYPE VARCHAR(100) USING "extra_hours_details"::TEXT;
