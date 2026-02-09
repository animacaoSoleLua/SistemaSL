import type { Prisma } from "@prisma/client";
import { hashPassword } from "../auth/password.js";
import { prisma } from "./prisma.js";

export const baseUsers: Prisma.UserCreateManyInput[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Admin",
    lastName: "Sol",
    email: "arthurssousa2004@gmail.com",
    cpf: "11111111111",
    birthDate: new Date("1988-01-10"),
    region: "Plano Piloto",
    phone: "(61) 99999-0001",
    passwordHash: hashPassword("admin123"),
    role: "admin",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Animador",
    lastName: "Lua",
    email: "animador@sol-e-lua.com",
    cpf: "22222222222",
    birthDate: new Date("1992-04-20"),
    region: "Ceilândia",
    phone: "(61) 99999-0002",
    passwordHash: hashPassword("animador123"),
    role: "animador",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Recreador",
    lastName: "Estrela",
    email: "recreador@sol-e-lua.com",
    cpf: "33333333333",
    birthDate: new Date("1995-08-15"),
    region: "Gama",
    phone: "(61) 99999-0003",
    passwordHash: hashPassword("recreador123"),
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
