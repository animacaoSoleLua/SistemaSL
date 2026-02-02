import { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  Role,
  updateUser,
} from "../auth/store.js";
import {
  getActiveSuspension,
  listWarningsForMember,
} from "../advertencias/store.js";
import { getCourseById, listEnrollmentsForMember } from "../cursos/store.js";
import { listFeedbacksForMember } from "../relatorios/store.js";

interface MemberBody {
  name?: string;
  email?: string;
  role?: Role;
  photo_url?: string;
  password?: string;
  is_active?: boolean;
}

interface MemberQuery {
  search?: string;
  role?: string;
  page?: string;
  limit?: string;
}

const roles: Role[] = ["admin", "animador", "recreador"];

function isValidRole(value: string | undefined): value is Role {
  return value !== undefined && roles.includes(value as Role);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function isEmailTaken(
  email: string,
  excludeId?: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const users = await listUsers();
  return users.some(
    (user) => user.id !== excludeId && normalizeEmail(user.email) === normalized
  );
}

function toMemberSummary(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoUrl?: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo_url: user.photoUrl ?? null,
    is_active: user.isActive,
  };
}

export async function membrosRoutes(app: FastifyInstance) {
  app.get("/api/v1/membros", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as MemberQuery;
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

    if (query.role && !isValidRole(query.role)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Papel invalido",
      });
    }

    let members = await listUsers();

    if (query.role) {
      members = members.filter((member) => member.role === query.role);
    }

    const search = query.search?.trim().toLowerCase();
    if (search) {
      members = members.filter((member) => {
        return (
          member.name.toLowerCase().includes(search) ||
          member.email.toLowerCase().includes(search)
        );
      });
    }

    members.sort((a, b) => a.name.localeCompare(b.name));

    const start = (page - 1) * limit;
    const paged = members.slice(start, start + limit);

    return reply.status(200).send({
      data: paged.map((member) => toMemberSummary(member)),
    });
  });

  app.post(
    "/api/v1/membros",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { name, email, role, password } = request.body as MemberBody;

      if (!name || !email || !role) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Nome, email e papel sao obrigatorios",
        });
      }

      if (password !== undefined && password.trim().length === 0) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Senha invalida",
        });
      }

      if (!isValidEmail(email)) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Email invalido",
        });
      }

      if (!isValidRole(role)) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Papel invalido",
        });
      }

      if (await isEmailTaken(email)) {
        return reply.status(409).send({
          error: "email_exists",
          message: "Email ja cadastrado",
        });
      }

      const member = await createUser({ name, email, role, password });
      if (!member) {
        return reply.status(409).send({
          error: "email_exists",
          message: "Email ja cadastrado",
        });
      }

      return reply.status(201).send({
        data: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          is_active: member.isActive,
        },
      });
    }
  );

  app.get("/api/v1/membros/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membro invalido",
      });
    }

    const member = await getUserById(params.id);
    if (!member) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    if (request.user.role !== "admin" && request.user.id !== member.id) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const warnings = await listWarningsForMember(member.id);
    warnings.sort((a, b) => {
      const dateDiff = b.warningDate.getTime() - a.warningDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const suspension = await getActiveSuspension(member.id);
    const feedbacks =
      request.user.role === "admin"
        ? await listFeedbacksForMember(member.id)
        : [];

    feedbacks.sort((a, b) => {
      const dateDiff = b.eventDate.getTime() - a.eventDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return reply.status(200).send({
      data: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        photo_url: member.photoUrl ?? null,
        is_active: member.isActive,
        courses: (
          await Promise.all(
            (await listEnrollmentsForMember(member.id)).map(
              async (enrollment) => {
                const course = await getCourseById(enrollment.courseId);
                if (!course) {
                  return null;
                }
                return {
                  id: course.id,
                  title: course.title,
                  course_date: formatDate(course.courseDate),
                  status: enrollment.status,
                };
              }
            )
          )
        ).filter(
          (
            entry
          ): entry is {
            id: string;
            title: string;
            course_date: string;
            status: string;
          } => entry !== null
        ),
        warnings: warnings.map((warning) => ({
          id: warning.id,
          reason: warning.reason,
          warning_date: formatDate(warning.warningDate),
          created_by: warning.createdBy,
        })),
        warnings_total: warnings.length,
        feedbacks: feedbacks.map((entry) => ({
          id: entry.id,
          report_id: entry.reportId,
          feedback: entry.feedback,
          event_date: formatDate(entry.eventDate),
          contractor_name: entry.contractorName,
        })),
        suspension: suspension
          ? {
              status: "suspended",
              start_date: formatDate(suspension.startDate),
              end_date: formatDate(suspension.endDate),
            }
          : {
              status: "active",
              start_date: null,
              end_date: null,
            },
      },
    });
  });

  app.patch("/api/v1/membros/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membro invalido",
      });
    }

    const member = await getUserById(params.id);
    if (!member) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const isAdmin = request.user.role === "admin";
    if (!isAdmin && request.user.id !== member.id) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const { name, email, role, photo_url, is_active } = request.body as MemberBody;

    if (
      !name &&
      !email &&
      !role &&
      photo_url === undefined &&
      is_active === undefined
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Nenhuma alteracao informada",
      });
    }

    if (email && !isValidEmail(email)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Email invalido",
      });
    }

    if (role && !isValidRole(role)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Papel invalido",
      });
    }

    if (!isAdmin && role) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Status invalido",
      });
    }

    if (!isAdmin && is_active !== undefined) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    if (email && (await isEmailTaken(email, member.id))) {
      return reply.status(409).send({
        error: "email_exists",
        message: "Email ja cadastrado",
      });
    }

    const updated = await updateUser(member.id, {
      name,
      email,
      role: isAdmin ? role : undefined,
      photoUrl: photo_url,
      isActive: isAdmin ? is_active : undefined,
    });

    if (!updated) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    return reply.status(200).send({
      data: {
        id: updated.id,
        name: updated.name,
      },
    });
  });

  app.delete(
    "/api/v1/membros/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Membro invalido",
        });
      }

      const removed = await deleteUser(params.id);
      if (!removed) {
        return reply.status(404).send({
          error: "not_found",
          message: "Membro nao encontrado",
        });
      }

      return reply.status(204).send();
    }
  );
}
