import { randomUUID } from "node:crypto";

export type Role = "admin" | "animador" | "recreador";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

const users: UserRecord[] = [
  {
    id: "user-admin-1",
    name: "Admin",
    email: "admin@sol-e-lua.com",
    password: "admin123",
    role: "admin",
  },
  {
    id: "user-animador-1",
    name: "Animador",
    email: "animador@sol-e-lua.com",
    password: "animador123",
    role: "animador",
  },
  {
    id: "user-recreador-1",
    name: "Recreador",
    email: "recreador@sol-e-lua.com",
    password: "recreador123",
    role: "recreador",
  },
];

const resetTokens = new Map<string, string>();

export function getUserByEmail(email: string): UserRecord | undefined {
  return users.find((user) => user.email === email);
}

export function getUserById(id: string): UserRecord | undefined {
  return users.find((user) => user.id === id);
}

export function updateUserPassword(id: string, password: string): void {
  const user = getUserById(id);
  if (!user) {
    return;
  }
  user.password = password;
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
