import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";

export type Role = "admin" | "animador" | "recreador";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  photoUrl?: string;
}

const resetTokens = new Map<string, string>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserRecord(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone: string | null;
  photoUrl: string | null;
}): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.passwordHash,
    role: user.role,
    phone: user.phone ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
  };
}

export async function getUserByEmail(
  email: string
): Promise<UserRecord | undefined> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
  });
  return user ? toUserRecord(user) : undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toUserRecord(user) : undefined;
}

export async function updateUserPassword(
  id: string,
  password: string
): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { passwordHash: password },
  });
}

export async function listUsers(): Promise<UserRecord[]> {
  const users = await prisma.user.findMany();
  return users.map((user) => toUserRecord(user));
}

export async function createUser(input: {
  name: string;
  email: string;
  role: Role;
  password?: string;
  phone?: string;
  photoUrl?: string;
}): Promise<UserRecord | undefined> {
  const email = normalizeEmail(input.email);
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return undefined;
  }

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash: input.password ?? "membro123",
      role: input.role,
      phone: input.phone,
      photoUrl: input.photoUrl,
    },
  });

  return toUserRecord(user);
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<UserRecord, "id" | "password">> & {
    password?: string;
  }
): Promise<UserRecord | undefined> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const data: {
    name?: string;
    email?: string;
    role?: Role;
    phone?: string | null;
    photoUrl?: string | null;
    passwordHash?: string;
  } = {};

  if (updates.name !== undefined) {
    data.name = updates.name;
  }
  if (updates.email !== undefined) {
    data.email = normalizeEmail(updates.email);
  }
  if (updates.role !== undefined) {
    data.role = updates.role;
  }
  if (updates.phone !== undefined) {
    data.phone = updates.phone ?? null;
  }
  if (updates.photoUrl !== undefined) {
    data.photoUrl = updates.photoUrl ?? null;
  }
  if (updates.password !== undefined) {
    data.passwordHash = updates.password;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  return toUserRecord(user);
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function createResetToken(userId: string): string {
  const token = randomUUID();
  resetTokens.set(token, userId);
  return token;
}

export function consumeResetToken(token: string): string | undefined {
  const userId = resetTokens.get(token);
  if (!userId) {
    return undefined;
  }
  resetTokens.delete(token);
  return userId;
}
