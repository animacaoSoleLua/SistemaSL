import { prisma } from "../../src/db/prisma.js";
import { baseUsers } from "../../src/db/seed.js";
import { hashPassword } from "../../src/auth/password.js";

export const testAdmin = {
  email: "suporte@gmail.com",
  password: "Senha123",
};

export const testMember1 = {
  email: "ana.souza@teste.com",
  password: "Senha123",
  name: "Ana",
  lastName: "Souza",
  role: "recreador" as const,
};

export const testMember2 = {
  email: "bruno.lima@teste.com",
  password: "Senha123",
  name: "Bruno",
  lastName: "Lima",
  role: "animador" as const,
};

export const testMember3 = {
  email: "carla.ferreira@teste.com",
  password: "Senha123",
  name: "Carla",
  lastName: "Ferreira",
  role: "recreador" as const,
};

const testScenarioUsers = [
  {
    name: "Arthur",
    lastName: "Sousa",
    email: "arthurssousa2004@gmail.com",
    passwordHash: hashPassword("admin123"),
    role: "admin" as const,
  },
  {
    name: "Animador",
    lastName: "Lua",
    email: "animador@sol-e-lua.com",
    passwordHash: hashPassword("animador123"),
    role: "animador" as const,
  },
  {
    name: "Recreador",
    lastName: "Sol",
    email: "recreador@sol-e-lua.com",
    passwordHash: hashPassword("recreador123"),
    role: "recreador" as const,
  },
];

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "skills", "report_feedbacks", "report_media", "reports", "course_enrollments", "courses", "warnings", "suspensions", "password_reset_tokens", "users" RESTART IDENTITY CASCADE'
  );
  await prisma.user.createMany({ data: baseUsers });
  await prisma.user.createMany({ data: testScenarioUsers });
  await prisma.user.createMany({
    data: [testMember1, testMember2, testMember3].map((m) => ({
      name: m.name,
      lastName: m.lastName,
      email: m.email,
      passwordHash: hashPassword(m.password),
      role: m.role,
    })),
  });
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
