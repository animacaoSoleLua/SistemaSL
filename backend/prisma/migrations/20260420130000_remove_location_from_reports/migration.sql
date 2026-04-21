-- Remove redundant location column (replaced by title_schedule)
ALTER TABLE "reports" DROP COLUMN "location";
