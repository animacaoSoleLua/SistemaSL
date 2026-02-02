import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { advertenciasRoutes } from "./advertencias/routes.js";
import { authGuard, requireRole } from "./auth/guard.js";
import { authRoutes } from "./auth/routes.js";
import { cursosRoutes } from "./cursos/routes.js";
import { dashboardRoutes } from "./dashboard/routes.js";
import { ensureBaseUsers } from "./db/seed.js";
import { membrosRoutes } from "./membros/routes.js";
import { relatoriosRoutes } from "./relatorios/routes.js";
import { healthRoutes } from "./routes/health.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function ensureUploadsWritable(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const probe = join(root, `.upload-probe-${randomUUID()}`);
  try {
    await writeFile(probe, "ok");
  } catch (error) {
    throw new Error("uploads_unwritable", { cause: error });
  } finally {
    await unlink(probe).catch(() => {});
  }
}

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  // Enable CORS for the frontend origin
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "https://solelua.cloud", "https://www.solelua.cloud"];

  app.register(cors, {
    origin: corsOrigins,
  });

  const uploadsRoot = process.env.UPLOADS_DIR
    ? resolve(process.env.UPLOADS_DIR)
    : join(process.cwd(), "uploads");

  try {
    mkdirSync(uploadsRoot, { recursive: true });
  } catch (error) {
    throw new Error("uploads_unwritable", { cause: error });
  }

  app.addHook("preHandler", authGuard);
  app.addHook("onReady", async () => {
    await ensureUploadsWritable(uploadsRoot);
    await ensureBaseUsers();
  });

  app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
    },
  });
  app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/uploads/",
  });

  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(healthRoutes);
  app.register(membrosRoutes);
  app.register(cursosRoutes);
  app.register(relatoriosRoutes);
  app.register(advertenciasRoutes);
  app.register(dashboardRoutes);

  app.get("/api/v1/secure/ping", async () => ({ status: "ok" }));
  app.get(
    "/api/v1/admin/ping",
    { preHandler: requireRole(["admin"]) },
    async () => ({ status: "ok" })
  );

  return app;
}
