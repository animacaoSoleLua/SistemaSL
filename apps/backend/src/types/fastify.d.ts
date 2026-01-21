import type { AuthUser } from "../auth/guard.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
