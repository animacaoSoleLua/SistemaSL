-- DropForeignKey
ALTER TABLE "client_feedback_members" DROP CONSTRAINT "client_feedback_members_member_id_fkey";

-- DropForeignKey
ALTER TABLE "client_feedbacks" DROP CONSTRAINT "client_feedbacks_created_by_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_member_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_created_by_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_instructor_id_fkey";

-- DropForeignKey
ALTER TABLE "report_feedbacks" DROP CONSTRAINT "report_feedbacks_member_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_author_id_fkey";

-- DropForeignKey
ALTER TABLE "suspensions" DROP CONSTRAINT "suspensions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "warnings" DROP CONSTRAINT "warnings_created_by_fkey";

-- DropForeignKey
ALTER TABLE "warnings" DROP CONSTRAINT "warnings_member_id_fkey";

-- AlterTable
ALTER TABLE "client_feedbacks" ALTER COLUMN "created_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "courses" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "instructor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "warnings" ALTER COLUMN "created_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_feedbacks" ADD CONSTRAINT "report_feedbacks_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedback_members" ADD CONSTRAINT "client_feedback_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
