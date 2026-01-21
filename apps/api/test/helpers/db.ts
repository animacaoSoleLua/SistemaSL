import { prisma } from "../../src/db/prisma.js";
import { baseUsers } from "../../src/db/seed.js";

export async function resetDatabase(): Promise<void> {
  await prisma.reportFeedback.deleteMany();
  await prisma.reportMedia.deleteMany();
  await prisma.report.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.warning.deleteMany();
  await prisma.suspension.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.createMany({ data: baseUsers });
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
