-- Convert extra_hours_details from VarChar to Int (field stores number of hours)
ALTER TABLE "reports"
  ALTER COLUMN "extra_hours_details" TYPE INTEGER
  USING CASE
    WHEN "extra_hours_details" ~ '^\d+(\.\d+)?$' THEN "extra_hours_details"::float::integer
    ELSE NULL
  END;

-- Make team_summary NOT NULL (backend always required it; fill any existing NULLs)
UPDATE "reports" SET "team_summary" = 'Nao informado' WHERE "team_summary" IS NULL;
ALTER TABLE "reports" ALTER COLUMN "team_summary" SET NOT NULL;
