import { prisma } from "../../src/db/prisma.js";
import { baseUsers } from "../../src/db/seed.js";

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe("SELECT pg_advisory_lock(2147483647)");
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "report_feedbacks", "report_media", "reports", "course_enrollments", "courses", "warnings", "suspensions", "password_reset_tokens", "users" RESTART IDENTITY CASCADE'
    );
    await prisma.user.createMany({ data: baseUsers });
  } finally {
    await prisma.$executeRawUnsafe("SELECT pg_advisory_unlock(2147483647)");
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
