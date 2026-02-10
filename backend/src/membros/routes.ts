import { FastifyInstance } from "fastify";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
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
import {
  getCourseById,
  listEnrollmentsForMember,
  type EnrollmentStatus,
} from "../cursos/store.js";
import { listFeedbacksForMember } from "../relatorios/store.js";

interface MemberBody {
  name?: string;
  last_name?: string;
  cpf?: string;
  email?: string;
  birth_date?: string;
  region?: string;
  phone?: string;
  role?: Role;
  photo_url?: string;
  password?: string;
}

interface MemberQuery {
  search?: string;
  role?: string;
  page?: string;
  limit?: string;
}

const uploadsRoot = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : join(process.cwd(), "uploads");

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const mimeImageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const roles: Role[] = ["admin", "animador", "recreador"];

function isValidRole(value: string | undefined): value is Role {
  return value !== undefined && roles.includes(value as Role);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  return digits.length === 11;
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

function resolveImageExtension(
  filename: string,
  mimetype?: string
): string | undefined {
  const extension = extname(filename).toLowerCase();
  if (extension && imageExtensions.includes(extension)) {
    return extension;
  }
  if (mimetype && mimeImageExtensions[mimetype]) {
    return mimeImageExtensions[mimetype];
  }
  return undefined;
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore errors while cleaning up temporary files
  }
}

async function saveUploadToDisk(options: {
  stream: NodeJS.ReadableStream;
  targetPath: string;
  maxSize: number;
}): Promise<number> {
  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > options.maxSize) {
        callback(new Error("file_too_large"));
        return;
      }
      callback(null, chunk);
    },
  });

  await mkdir(dirname(options.targetPath), { recursive: true });

  try {
    await pipeline(options.stream, counter, createWriteStream(options.targetPath));
  } catch (error) {
    await safeUnlink(options.targetPath);
    throw error;
  }

  return size;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  if (formatDate(parsed) !== value) {
    return undefined;
  }
  return parsed;
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
  lastName?: string;
  email: string;
  birthDate?: Date;
  region?: string;
  phone?: string;
  role: Role;
  photoUrl?: string;
}) {
  return {
    id: user.id,
    name: user.name,
    last_name: user.lastName ?? null,
    email: user.email,
    birth_date: user.birthDate ? formatDate(user.birthDate) : null,
    region: user.region ?? null,
    phone: user.phone ?? null,
    role: user.role,
    photo_url: user.photoUrl ?? null,
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
      const {
        name,
        last_name,
        cpf,
        email,
        birth_date,
        region,
        phone,
        role,
        password,
      } = request.body as MemberBody;

      if (
        !name ||
        !last_name ||
        !cpf ||
        !email ||
        !birth_date ||
        !region ||
        !phone ||
        !role
      ) {
        return reply.status(400).send({
          error: "invalid_request",
          message:
            "Nome, sobrenome, CPF, nascimento, regiao, telefone, email e papel sao obrigatorios",
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

      const parsedBirthDate = parseDate(birth_date);
      if (!parsedBirthDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data de nascimento invalida",
        });
      }

      if (!region.trim()) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Regiao invalida",
        });
      }

      if (!phone.trim()) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Telefone invalido",
        });
      }

      if (!isValidCpf(cpf)) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "CPF invalido",
        });
      }

      const normalizedCpf = normalizeCpf(cpf);

      if (await isEmailTaken(email)) {
        return reply.status(409).send({
          error: "email_exists",
          message: "Email ja cadastrado",
        });
      }

      const member = await createUser({
        name,
        lastName: last_name,
        email,
        cpf: normalizedCpf,
        birthDate: parsedBirthDate,
        region: region.trim(),
        phone: phone.trim(),
        role,
        password,
      });
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
          last_name: member.lastName ?? null,
          email: member.email,
          birth_date: member.birthDate ? formatDate(member.birthDate) : null,
          region: member.region ?? null,
          phone: member.phone ?? null,
          role: member.role,
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
        last_name: member.lastName ?? null,
        cpf: member.cpf ?? null,
        email: member.email,
        birth_date: member.birthDate ? formatDate(member.birthDate) : null,
        region: member.region ?? null,
        phone: member.phone ?? null,
        role: member.role,
        photo_url: member.photoUrl ?? null,
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
            status: EnrollmentStatus;
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

    const {
      name,
      last_name,
      cpf,
      email,
      birth_date,
      region,
      phone,
      role,
      photo_url,
    } = request.body as MemberBody;

    if (
      !name &&
      !last_name &&
      !cpf &&
      !email &&
      !birth_date &&
      !region &&
      !phone &&
      !role &&
      photo_url === undefined
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

    const parsedBirthDate = birth_date ? parseDate(birth_date) : undefined;
    if (birth_date && !parsedBirthDate) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Data de nascimento invalida",
      });
    }

    if (region !== undefined && !region.trim()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Regiao invalida",
      });
    }

    if (phone !== undefined && !phone.trim()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Telefone invalido",
      });
    }

    if (cpf !== undefined && (!cpf.trim() || !isValidCpf(cpf))) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "CPF invalido",
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

    if (email && (await isEmailTaken(email, member.id))) {
      return reply.status(409).send({
        error: "email_exists",
        message: "Email ja cadastrado",
      });
    }

    const updated = await updateUser(member.id, {
      name,
      lastName: last_name,
      email,
      cpf: cpf ? normalizeCpf(cpf) : undefined,
      birthDate: parsedBirthDate,
      region: region?.trim(),
      phone: phone?.trim(),
      role: isAdmin ? role : undefined,
      photoUrl: photo_url,
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

  app.post("/api/v1/membros/:id/foto", async (request, reply) => {
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

    if (!request.isMultipart()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Envie o arquivo usando multipart/form-data",
      });
    }

    const fileData = await request.file();
    if (!fileData) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Arquivo ausente",
      });
    }

    if (!fileData.mimetype?.startsWith("image/")) {
      return reply.status(400).send({
        error: "invalid_media_type",
        message: "Apenas imagens sao permitidas",
      });
    }

    const extension = resolveImageExtension(
      fileData.filename ?? "",
      fileData.mimetype
    );
    if (!extension) {
      return reply.status(400).send({
        error: "invalid_media_url",
        message: "Extensao de arquivo invalida",
      });
    }

    const filename = `perfil-${randomUUID()}${extension}`;
    const relativePath = join("membros", member.id, filename);
    const storagePath = join(uploadsRoot, relativePath);
    const fileStream = fileData.file as NodeJS.ReadableStream & {
      truncated?: boolean;
    };

    try {
      await saveUploadToDisk({
        stream: fileStream,
        targetPath: storagePath,
        maxSize: MAX_PROFILE_PHOTO_BYTES,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "file_too_large") {
        return reply.status(400).send({
          error: "file_too_large",
          message: "Arquivo excede o tamanho permitido",
        });
      }
      throw error;
    }

    if (fileStream.truncated) {
      await safeUnlink(storagePath);
      return reply.status(400).send({
        error: "file_too_large",
        message: "Arquivo excede o tamanho permitido",
      });
    }

    const publicPath = relativePath.split(sep).join("/");
    const url = `/uploads/${publicPath}`;

    const updated = await updateUser(member.id, { photoUrl: url });
    if (!updated) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    return reply.status(200).send({
      data: {
        id: updated.id,
        photo_url: updated.photoUrl ?? null,
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
