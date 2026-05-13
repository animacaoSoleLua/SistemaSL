import "@fastify/cookie";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import type { Role } from "./store.js";
import { verifyAccessToken } from "./token.js";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  permissions: string[];
}

function getPath(request: FastifyRequest): string {
  const rawUrl = request.raw.url ?? request.url;
  return rawUrl.split("?")[0];
}

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.method === "OPTIONS") {
    return;
  }
  const path = getPath(request);
  if (!path.startsWith("/api/v1")) {
    return;
  }
  if (path.startsWith("/api/v1/auth")) {
    return;
  }

  const cookieToken = request.cookies?.["auth_token"];
  const header = request.headers.authorization;
  const token =
    cookieToken ??
    (header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined);

  if (!token) {
    reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    reply.status(401).send({ error: "unauthorized", message: "Token invalido" });
    return;
  }

  const permRows = await prisma.userPermission.findMany({
    where: { userId: payload.sub },
    select: { permission: true },
  });

  request.user = {
    id: payload.sub,
    name: payload.name,
    role: payload.role,
    permissions: permRows.map((r) => r.permission as string),
  };
}

export function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
      return;
    }
    if (!roles.includes(request.user.role)) {
      reply.status(403).send({ error: "forbidden", message: "Acesso negado" });
      return;
    }
  };
}

export function requireAccess(roles: Role[], permissions: string[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
      return;
    }
    if (roles.includes(request.user.role)) return;
    if (
      permissions.length > 0 &&
      permissions.some((p) => request.user!.permissions.includes(p))
    ) {
      return;
    }
    reply.status(403).send({ error: "forbidden", message: "Acesso negado" });
  };
}
