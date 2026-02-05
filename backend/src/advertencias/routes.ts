import { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  createWarning,
  deleteWarning,
  getWarningById,
  listWarnings,
  listWarningsByCreator,
  listWarningsForMember,
  updateWarning,
} from "./store.js";

interface WarningBody {
  member_id?: string;
  reason?: string;
  warning_date?: string;
}

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

    let warnings = await listWarnings();

    if (isAdmin) {
      if (query.member_id) {
        warnings = warnings.filter((warning) => warning.memberId === query.member_id);
      }
      if (query.created_by) {
        const creatorId = createdByMe ? request.user.id : query.created_by;
        warnings = warnings.filter((warning) => warning.createdBy === creatorId);
      }
    } else if (createdByMe) {
      warnings = await listWarningsByCreator(request.user.id);
    } else {
      warnings = await listWarningsForMember(request.user.id);
    }

    warnings.sort((a, b) => {
      const dateDiff = b.warningDate.getTime() - a.warningDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const start = (page - 1) * limit;
    const paged = warnings.slice(start, start + limit);

    return reply.status(200).send({
      data: paged.map((warning) => ({
        id: warning.id,
        member_id: warning.memberId,
        reason: warning.reason,
        warning_date: formatDate(warning.warningDate),
      })),
    });
  });

  app.post(
    "/api/v1/advertencias",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const { member_id, reason, warning_date } = request.body as WarningBody;

      const normalizedReason = reason?.trim() ?? "";
      if (!member_id || !normalizedReason || !warning_date) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Membro, motivo e data sao obrigatorios",
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
        reason: normalizedReason,
        warningDate: parsedDate,
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

      const { reason, warning_date } = request.body as WarningBody;
      const trimmedReason = reason?.trim();
      const parsedDate = parseDate(warning_date);

      if (!trimmedReason && !parsedDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Informe uma descricao ou data",
        });
      }

      if (reason !== undefined && !trimmedReason) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Descricao invalida",
        });
      }

      if (warning_date !== undefined && !parsedDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data da advertencia invalida",
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
