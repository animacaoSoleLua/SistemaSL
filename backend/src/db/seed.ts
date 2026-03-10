import type { Prisma } from "@prisma/client";
import { hashPassword } from "../auth/password.js";
import { prisma } from "./prisma.js";

export const baseUsers: Prisma.UserCreateManyInput[] = [
{
    id: "11111111-1111-0000-1111-111111111111",
    name: "Suporte",
    lastName: "Sol e Lua",
    email: "suporte@gmail.com",
    cpf: "529.982.247-25",
    birthDate: new Date("2026-01-01"),
    region: "DF",
    phone: "(61) 00000-0000",
    passwordHash: hashPassword("Senha123"),
    role: "admin",
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
