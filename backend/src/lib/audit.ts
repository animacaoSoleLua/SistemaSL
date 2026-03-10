import type { FastifyBaseLogger } from "fastify";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "MEMBER_CREATED"
  | "MEMBER_UPDATED"
  | "MEMBER_DELETED"
  | "WARNING_CREATED"
  | "WARNING_UPDATED"
  | "WARNING_DELETED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED";

export function auditLog(
  logger: FastifyBaseLogger,
  action: AuditAction,
  actorId: string,
  options: { targetId?: string; ip?: string; detail?: string } = {}
): void {
  logger.info({
    audit: true,
    action,
    actorId,
    targetId: options.targetId ?? null,
    ip: options.ip ?? null,
    detail: options.detail ?? null,
    timestamp: new Date().toISOString(),
  });
}
