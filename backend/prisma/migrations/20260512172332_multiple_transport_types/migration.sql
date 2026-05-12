/*
  Warnings:

  - You are about to drop the column `transport_type` on the `reports` table. All the data in the column will be lost.

*/
-- AlterTable: add new column with default, backfill, drop old column, remove default
ALTER TABLE "reports" ADD COLUMN "transport_types" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "reports" SET "transport_types" = ARRAY["transport_type"];
ALTER TABLE "reports" DROP COLUMN "transport_type";
ALTER TABLE "reports" ALTER COLUMN "transport_types" DROP DEFAULT;
