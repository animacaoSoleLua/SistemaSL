-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('positive', 'negative');

-- CreateTable
CREATE TABLE "client_feedbacks" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "text" TEXT,
    "audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_feedback_members" (
    "id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "client_feedback_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_creator" ON "client_feedbacks"("created_by");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_type" ON "client_feedbacks"("type");

-- CreateIndex
CREATE UNIQUE INDEX "client_feedback_members_feedback_id_member_id_key" ON "client_feedback_members"("feedback_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_client_feedback_members_member" ON "client_feedback_members"("member_id");

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedback_members" ADD CONSTRAINT "client_feedback_members_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "client_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedback_members" ADD CONSTRAINT "client_feedback_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
