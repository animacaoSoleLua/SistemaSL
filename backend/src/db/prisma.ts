import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

const dbUrl = process.env.DATABASE_URL ?? "";
const pooledUrl = dbUrl.includes("connection_limit")
  ? dbUrl
  : dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=20";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: pooledUrl } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
