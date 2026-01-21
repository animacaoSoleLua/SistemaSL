import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "./store.js";
import { verifyAccessToken } from "./token.js";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

function getPath(request: FastifyRequest): string {
  const rawUrl = request.raw.url ?? request.url;
  return rawUrl.split("?")[0];
}

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const path = getPath(request);
  if (!path.startsWith("/api/v1")) {
    return;
  }
  if (path.startsWith("/api/v1/auth")) {
    return;
  }

  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({
      error: "unauthorized",
      message: "Token ausente",
    });
    return;
  }

  const token = header.slice("Bearer ".length);
  const payload = verifyAccessToken(token);
  if (!payload) {
    reply.status(401).send({
      error: "unauthorized",
      message: "Token invalido",
    });
    return;
  }

  request.user = {
    id: payload.sub,
    name: payload.name,
    role: payload.role,
  };
}

export function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
      return;
    }

    if (!roles.includes(request.user.role)) {
      reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
      return;
    }
  };
}
