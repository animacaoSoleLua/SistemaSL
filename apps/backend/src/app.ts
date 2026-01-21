import Fastify, { FastifyInstance } from "fastify";
import { authRoutes } from "./auth/routes.js";
import { authGuard, requireRole } from "./auth/guard.js";
import { advertenciasRoutes } from "./advertencias/routes.js";
import { cursosRoutes } from "./cursos/routes.js";
import { dashboardRoutes } from "./dashboard/routes.js";
import { ensureBaseUsers } from "./db/seed.js";
import { membrosRoutes } from "./membros/routes.js";
import { healthRoutes } from "./routes/health.js";
import { relatoriosRoutes } from "./relatorios/routes.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.addHook("preHandler", authGuard);
  app.addHook("onReady", async () => {
    await ensureBaseUsers();
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
