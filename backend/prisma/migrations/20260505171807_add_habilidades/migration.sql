-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_skills" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "idx_member_skills_member" ON "member_skills"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_skills_skill" ON "member_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_skills_member_id_skill_id_key" ON "member_skills"("member_id", "skill_id");

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
