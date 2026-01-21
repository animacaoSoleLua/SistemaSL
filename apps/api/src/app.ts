import Fastify, { FastifyInstance } from "fastify";
import { authRoutes } from "./auth/routes.js";
import { authGuard, requireRole } from "./auth/guard.js";
import { healthRoutes } from "./routes/health.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.addHook("preHandler", authGuard);

  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(healthRoutes);

  app.get("/api/v1/secure/ping", async () => ({ status: "ok" }));
  app.get(
    "/api/v1/admin/ping",
    { preHandler: requireRole(["admin"]) },
    async () => ({ status: "ok" })
  );

  return app;
}
