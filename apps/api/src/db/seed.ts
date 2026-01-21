import { prisma } from "./prisma.js";

export const baseUsers = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Admin",
    email: "admin@sol-e-lua.com",
    passwordHash: "admin123",
    role: "admin",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Animador",
    email: "animador@sol-e-lua.com",
    passwordHash: "animador123",
    role: "animador",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Recreador",
    email: "recreador@sol-e-lua.com",
    passwordHash: "recreador123",
    role: "recreador",
  },
];

export async function ensureBaseUsers(): Promise<void> {
  const emails = baseUsers.map((user) => user.email);
  const existing = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((user) => user.email));
  const missing = baseUsers.filter((user) => !existingEmails.has(user.email));
  if (missing.length === 0) {
    return;
  }

  await prisma.user.createMany({
    data: missing,
    skipDuplicates: true,
  });
}
