import type { AuthUser } from "../auth/guard.ts";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
