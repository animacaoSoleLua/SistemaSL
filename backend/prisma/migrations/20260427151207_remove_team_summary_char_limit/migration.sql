/*
  Warnings:

  - You are about to drop the column `event_date` on the `client_feedbacks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client_feedbacks" DROP COLUMN "event_date";

-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "team_summary" SET DATA TYPE TEXT;
