import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/guard.js";
import { auditLog } from "../lib/audit.js";
import { getUserById } from "../auth/store.js";
import {
  createWarning,
  deleteWarning,
  getWarningById,
  listWarnings,
  updateWarning,
} from "./store.js";

const todayDateString = () => new Date().toISOString().slice(0, 10);

const CreateWarningSchema = z.object({
  member_id: z.string().min(1, "Membro obrigatorio"),
  reason: z.string().min(5, "Motivo deve ter ao menos 5 caracteres").max(500, "Motivo muito longo"),
  warning_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (YYYY-MM-DD)")
    .refine((date) => date <= todayDateString(), {
      message: "Data da advertencia nao pode ser no futuro",
    }),
});

const UpdateWarningSchema = z.object({
  reason: z.string().min(5, "Motivo deve ter ao menos 5 caracteres").max(500).optional(),
  warning_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (YYYY-MM-DD)")
    .refine((date) => date <= todayDateString(), {
      message: "Data da advertencia nao pode ser no futuro",
    })
    .optional(),
});

interface WarningQuery {
  member_id?: string;
  created_by?: string;
  page?: string;
  limit?: string;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function isCreatedByMe(value: string | undefined): boolean {
  return value?.toLowerCase() === "me";
}

export async function advertenciasRoutes(app: FastifyInstance) {
  app.get("/api/v1/advertencias", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as WarningQuery;
    const parsedPage = parsePositiveInt(query.page);
    const parsedLimit = parsePositiveInt(query.limit);
    const page = parsedPage ?? 1;
    const limit = parsedLimit ?? 20;

    if (query.page && parsedPage === undefined) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Pagina invalida",
      });
    }

    if (query.limit && parsedLimit === undefined) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Limite invalido",
      });
    }

    const isAdmin = request.user.role === "admin";
    const createdByMe = isCreatedByMe(query.created_by);

    if (!isAdmin) {
      if (query.created_by && !createdByMe) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      if (query.member_id && query.member_id !== request.user.id) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }
    }

    let memberId: string | undefined;
    let createdBy: string | undefined;

    if (isAdmin) {
      if (query.member_id) memberId = query.member_id;
      if (query.created_by) createdBy = createdByMe ? request.user.id : query.created_by;
    } else if (createdByMe) {
      createdBy = request.user.id;
    } else {
      memberId = request.user.id;
    }

    const result = await listWarnings({ memberId, createdBy, page, limit });

    return reply.status(200).send({
      data: result.warnings.map((warning) => ({
        id: warning.id,
        member_id: warning.memberId,
        reason: warning.reason,
        warning_date: formatDate(warning.warningDate),
      })),
      total: result.total,
      pages: result.pages,
      page,
      limit,
    });
  });

  app.post(
    "/api/v1/advertencias",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const parsedBody = CreateWarningSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsedBody.error.issues[0].message,
        });
      }

      const { member_id, reason, warning_date } = parsedBody.data;

      if (member_id === request.user!.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Voce nao pode dar uma advertencia para si mesmo",
        });
      }

      const member = await getUserById(member_id);
      if (!member) {
        return reply.status(404).send({
          error: "not_found",
          message: "Membro nao encontrado",
        });
      }

      const parsedDate = parseDate(warning_date);
      if (!parsedDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data da advertencia invalida",
        });
      }

      const result = await createWarning(request.user!.id, {
        memberId: member.id,
        reason: reason.trim(),
        warningDate: parsedDate,
      });

      auditLog(request.log, "WARNING_CREATED", request.user!.id, {
        targetId: member.id,
        ip: request.ip ?? "unknown",
        detail: `reason: ${reason.trim()}`,
      });

      return reply.status(201).send({
        data: {
          id: result.warning.id,
          suspension_applied: result.suspensionApplied,
        },
      });
    }
  );

  app.delete(
    "/api/v1/advertencias/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Advertencia invalida",
        });
      }

      const deleted = await deleteWarning(params.id, request.user!.id);
      if (!deleted) {
        return reply.status(404).send({
          error: "not_found",
          message: "Advertencia nao encontrada",
        });
      }

      auditLog(request.log, "WARNING_DELETED", request.user!.id, {
        targetId: params.id,
        ip: request.ip ?? "unknown",
      });

      return reply.status(204).send();
    }
  );

  app.patch(
    "/api/v1/advertencias/:id",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Advertencia invalida",
        });
      }

      const existing = await getWarningById(params.id);
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({
          error: "not_found",
          message: "Advertencia nao encontrada",
        });
      }

      if (request.user?.role !== "admin" && existing.createdBy !== request.user?.id) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      const parsedBody = UpdateWarningSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsedBody.error.issues[0].message,
        });
      }

      const { reason, warning_date } = parsedBody.data;
      const trimmedReason = reason?.trim();
      const parsedDate = parseDate(warning_date);

      if (!trimmedReason && !parsedDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Informe uma descricao ou data",
        });
      }

      const updated = await updateWarning(params.id, {
        reason: trimmedReason ?? undefined,
        warningDate: parsedDate,
      });

      if (!updated) {
        return reply.status(404).send({
          error: "not_found",
          message: "Advertencia nao encontrada",
        });
      }

      return reply.status(200).send({
        data: {
          id: updated.id,
          warning_date: formatDate(updated.warningDate),
          reason: updated.reason,
        },
      });
    }
  );

}
