import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  ALL_PERMISSIONS,
  getUserPermissions,
  setUserPermissions,
  type Permission,
} from "./store.js";

export async function permissoesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/membros/:id/permissoes",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const member = await getUserById(id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro não encontrado" });
      }
      const permissions = await getUserPermissions(id);
      return reply.status(200).send({ data: { permissions } });
    }
  );

  app.put(
    "/api/v1/membros/:id/permissoes",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { permissions?: unknown };

      const member = await getUserById(id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro não encontrado" });
      }

      if (!Array.isArray(body.permissions)) {
        return reply.status(400).send({ error: "bad_request", message: "permissions deve ser um array" });
      }

      const valid = body.permissions.filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission)
      );

      await setUserPermissions(id, request.user!.id, valid);
      return reply.status(200).send({ data: { permissions: valid } });
    }
  );
}
