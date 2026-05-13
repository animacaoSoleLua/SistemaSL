import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";

export type Permission =
  | "dashboard"
  | "gerencia"
  | "relatorios"
  | "advertencias"
  | "feedbacks"
  | "habilidades";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard",
  "gerencia",
  "relatorios",
  "advertencias",
  "feedbacks",
  "habilidades",
];

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const rows = await prisma.userPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return rows.map((r) => r.permission as Permission);
}

export async function setUserPermissions(
  userId: string,
  grantedById: string,
  permissions: Permission[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId } });
    if (permissions.length > 0) {
      await tx.userPermission.createMany({
        data: permissions.map((permission) => ({
          id: randomUUID(),
          userId,
          permission,
          grantedById,
        })),
      });
    }
  });
}
