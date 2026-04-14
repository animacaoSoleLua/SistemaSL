import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/guard.js";
import { getUserById, listUsers } from "../auth/store.js";
import { prisma } from "../db/prisma.js";
import {
  sendCourseCreatedEmail,
  sendEnrollmentConfirmationEmail,
} from "../lib/email.js";
// GOOGLE_CALENDAR_DISABLED_START
// import {
//   createOrgEvent,
//   createUserEvent,
//   deleteOrgEvent,
//   deleteUserEvent,
//   updateOrgEvent,
// } from "../lib/googleCalendar.js";
// GOOGLE_CALENDAR_DISABLED_END
import {
  addEnrollment,
  archiveCourse,
  createCourse,
  deleteCourse,
  EnrollmentStatus,
  finalizeEnrollments,
  getCourseById,
  getCourseWithMembers,
  getEnrollmentById,
  getEnrollmentByMember,
  importCourse,
  listArchivedCourses,
  listCourses,
  removeEnrollment,
  updateCourse,
  // updateCourseCalendarEventId, // GOOGLE_CALENDAR_DISABLED
  // updateEnrollmentCalendarEventId, // GOOGLE_CALENDAR_DISABLED
  updateEnrollmentStatus,
} from "./store.js";

const CreateCourseSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio"),
  description: z.string().optional(),
  course_date: z.string().min(1, "Data obrigatoria"),
  location: z.string().optional(),
  capacity: z.number().int().positive("Vagas devem ser maior que zero").optional(),
  instructor_id: z.string().min(1, "Instrutor obrigatorio"),
});

const UpdateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  course_date: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  instructor_id: z.string().min(1).optional(),
});

const ImportCourseSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio"),
  description: z.string().optional(),
  course_date: z.string().min(1, "Data obrigatoria"),
  location: z.string().optional(),
  instructor_id: z.string().min(1, "Instrutor obrigatorio"),
  members: z
    .array(
      z.object({
        member_id: z.string().min(1),
        status: z.enum(["attended", "missed"]),
      })
    )
    .default([]),
});

interface EnrollmentBody {
  member_id?: string;
}

interface EnrollmentUpdateBody {
  status?: EnrollmentStatus;
}

interface CourseQuery {
  status?: string;
  page?: string;
  limit?: string;
  period_start?: string;
  period_end?: string;
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
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

function isValidStatusFilter(value: string): boolean {
  return value === "available" || value === "full" || value === "all" || value === "archived";
}

export async function cursosRoutes(app: FastifyInstance) {
  app.get("/api/v1/cursos", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as CourseQuery;
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

    const periodStart = parseDate(query.period_start);
    const periodEnd = parseDate(query.period_end);

    if (query.period_start && !periodStart) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo inicial invalido",
      });
    }

    if (query.period_end && !periodEnd) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo final invalido",
      });
    }

    if (query.status && !isValidStatusFilter(query.status)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Status invalido",
      });
    }

    let courses = query.status === "archived"
      ? await listArchivedCourses()
      : await listCourses();

    if (query.status && query.status !== "all" && query.status !== "archived") {
      courses = courses.filter((course) => {
        if (course.capacity === null) {
          return query.status === "available";
        }
        const remaining = course.capacity - course.enrollments.length;
        if (query.status === "available") {
          return remaining > 0;
        }
        return remaining <= 0;
      });
    }

    if (periodStart) {
      courses = courses.filter((course) => course.courseDate >= periodStart);
    }
    if (periodEnd) {
      courses = courses.filter((course) => course.courseDate <= periodEnd);
    }

    courses.sort((a, b) => a.courseDate.getTime() - b.courseDate.getTime());

    const start = (page - 1) * limit;
    const paged = courses.slice(start, start + limit);

    return reply.status(200).send({
      data: paged.map((course) => ({
        id: course.id,
        title: course.title,
        course_date: formatDate(course.courseDate),
        capacity: course.capacity,
        created_by: course.createdBy,
        instructor: {
          id: course.instructorId,
          name: course.instructorName,
        },
        enrolled_count: course.enrollments.length,
        available_spots: course.capacity === null
          ? null
          : Math.max(course.capacity - course.enrollments.length, 0),
      })),
    });
  });

  app.post(
    "/api/v1/cursos",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const parsedBody = CreateCourseSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsedBody.error.issues[0].message,
        });
      }

      const { title, description, course_date, location, capacity, instructor_id } =
        parsedBody.data;

      const courseDate = parseDate(course_date);
      if (!courseDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data do curso invalida",
        });
      }

      if (!(await getUserById(instructor_id))) {
        return reply.status(404).send({
          error: "not_found",
          message: "Instrutor nao encontrado",
        });
      }

      const course = await createCourse(request.user!.id, {
        instructorId: instructor_id,
        title,
        description,
        courseDate,
        location,
        capacity,
      });

      listUsers().then((members) =>
        sendCourseCreatedEmail(course, members).catch((err) =>
          console.error("sendCourseCreatedEmail failed", err)
        )
      ).catch((err) => console.error("listUsers failed for course email", err));

      // GOOGLE_CALENDAR_DISABLED_START
      // // Cria evento no Google Calendar da organização (não-bloqueante)
      // createOrgEvent({ title, description, location, courseDate }).then(
      //   (eventId) => {
      //     if (eventId) updateCourseCalendarEventId(course.id, eventId).catch(() => {});
      //   }
      // ).catch(() => {});
      // GOOGLE_CALENDAR_DISABLED_END

      return reply.status(201).send({
        data: { id: course.id },
      });
    }
  );

  app.patch(
    "/api/v1/cursos/:id",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Curso invalido",
        });
      }

      const course = await getCourseById(params.id);
      if (!course) {
        return reply.status(404).send({
          error: "not_found",
          message: "Curso nao encontrado",
        });
      }

      if (!request.user) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Token ausente",
        });
      }

      if (request.user.role !== "admin" && course.createdBy !== request.user.id) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      const parsedBody = UpdateCourseSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsedBody.error.issues[0].message,
        });
      }

      const { title, description, course_date, location, capacity, instructor_id } =
        parsedBody.data;

      if (capacity !== undefined && capacity !== null) {
        if (capacity < course.enrollments.length) {
          return reply.status(409).send({
            error: "invalid_request",
            message: "Vagas menores que inscritos",
          });
        }
      }

      const courseDate = course_date ? parseDate(course_date) : undefined;
      if (course_date && !courseDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data do curso invalida",
        });
      }

      if (instructor_id && !(await getUserById(instructor_id))) {
        return reply.status(404).send({
          error: "not_found",
          message: "Instrutor nao encontrado",
        });
      }

      const normalizedDescription =
        description === undefined ? undefined : description.trim() || null;
      const normalizedLocation =
        location === undefined ? undefined : location.trim() || null;

      const updated = await updateCourse(course.id, {
        instructorId: instructor_id,
        title: title?.trim(),
        description: normalizedDescription,
        courseDate,
        location: normalizedLocation,
        capacity,
      });

      // GOOGLE_CALENDAR_DISABLED_START
      // // Atualiza evento no Google Calendar da organização (não-bloqueante)
      // if (updated.googleCalendarEventId) {
      //   updateOrgEvent(updated.googleCalendarEventId, {
      //     title: updated.title,
      //     description: updated.description,
      //     location: updated.location,
      //     courseDate: updated.courseDate,
      //   }).catch(() => {});
      // }
      // GOOGLE_CALENDAR_DISABLED_END

      return reply.status(200).send({
        data: {
          id: updated.id,
        },
      });
    }
  );

  app.delete(
    "/api/v1/cursos/:id",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Curso invalido",
        });
      }

      const course = await getCourseById(params.id);
      if (!course) {
        return reply.status(404).send({
          error: "not_found",
          message: "Curso nao encontrado",
        });
      }

      if (!request.user) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Token ausente",
        });
      }

      if (request.user.role !== "admin" && course.createdBy !== request.user.id) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      // GOOGLE_CALENDAR_DISABLED_START
      // // Remove evento do Google Calendar da organização (não-bloqueante)
      // if (course.googleCalendarEventId) {
      //   deleteOrgEvent(course.googleCalendarEventId).catch(() => {});
      // }
      // GOOGLE_CALENDAR_DISABLED_END

      await deleteCourse(course.id);

      return reply.status(200).send({
        data: { id: course.id },
      });
    }
  );

  app.post(
    "/api/v1/cursos/importar",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const parsedBody = ImportCourseSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsedBody.error.issues[0].message,
        });
      }

      const { title, description, course_date, location, instructor_id, members } =
        parsedBody.data;

      const courseDate = parseDate(course_date);
      if (!courseDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data do curso invalida",
        });
      }

      if (!(await getUserById(instructor_id))) {
        return reply.status(404).send({
          error: "not_found",
          message: "Instrutor nao encontrado",
        });
      }

      // Verificar duplicatas na lista de membros
      const memberIds = members.map((m) => m.member_id);
      const uniqueIds = new Set(memberIds);
      if (uniqueIds.size !== memberIds.length) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Membros duplicados na lista",
        });
      }

      // Verificar que todos os membros existem
      for (const memberId of memberIds) {
        if (!(await getUserById(memberId))) {
          return reply.status(404).send({
            error: "not_found",
            message: "Membro nao encontrado",
          });
        }
      }

      const course = await importCourse(request.user!.id, {
        instructorId: instructor_id,
        title,
        description,
        courseDate,
        location,
        members: members.map((m) => ({
          memberId: m.member_id,
          status: m.status,
        })),
      });

      return reply.status(201).send({
        data: {
          id: course.id,
          imported_count: course.enrollments.length,
        },
      });
    }
  );

  app.get("/api/v1/cursos/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Curso invalido",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const course = await getCourseWithMembers(params.id);
    if (!course) {
      return reply.status(404).send({
        error: "not_found",
        message: "Curso nao encontrado",
      });
    }

    const base = {
      id: course.id,
      title: course.title,
      description: course.description ?? null,
      course_date: formatDate(course.courseDate),
      location: course.location ?? null,
      capacity: course.capacity,
      created_by: course.createdBy,
      instructor: {
        id: course.instructorId,
        name: course.instructorName,
      },
      enrolled_count: course.enrollments.length,
      available_spots: course.capacity === null
        ? null
        : Math.max(course.capacity - course.enrollments.length, 0),
    };

    const isAdminOrInstructor =
      request.user.role === "admin" ||
      request.user.id === course.instructorId;

    if (isAdminOrInstructor) {
      return reply.status(200).send({
        data: {
          ...base,
          enrollments: course.enrollments.map((enrollment) => ({
            id: enrollment.id,
            member_id: enrollment.memberId,
            member_name: enrollment.memberName,
            status: enrollment.status,
          })),
        },
      });
    }

    const enrollment = course.enrollments.find(
      (e) => e.memberId === request.user!.id
    );
    return reply.status(200).send({
      data: {
        ...base,
        enrollment: enrollment
          ? { id: enrollment.id, status: enrollment.status }
          : null,
      },
    });
  });

  app.get("/api/v1/cursos/:id/inscricoes", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Curso invalido",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    // Fetch course to ensure it exists
    const course = await getCourseById(params.id);
    if (!course) {
      return reply.status(404).send({
        error: "not_found",
        message: "Curso nao encontrado",
      });
    }

    try {
      // Fetch enrolled members with their names
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId: params.id },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
      });

      // Format response: return id and full name
      const formattedEnrollments = enrollments.map((e) => ({
        id: e.member.id,
        name: `${e.member.name}${e.member.lastName ? " " + e.member.lastName : ""}`,
      }));

      return reply.status(200).send({
        data: formattedEnrollments,
      });
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      return reply.status(500).send({
        error: "internal_error",
        message: "Erro ao carregar inscritos",
      });
    }
  });

  app.post("/api/v1/cursos/:id/inscricoes", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Curso invalido",
      });
    }

    const course = await getCourseById(params.id);
    if (!course) {
      return reply.status(404).send({
        error: "not_found",
        message: "Curso nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const { member_id } = request.body as EnrollmentBody;
    if (!member_id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membro obrigatorio",
      });
    }

    if (request.user.role !== "admin" && request.user.id !== member_id) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    if (!(await getUserById(member_id))) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    if (getEnrollmentByMember(course, member_id)) {
      return reply.status(409).send({
        error: "already_enrolled",
        message: "Membro ja inscrito",
      });
    }

    if (member_id === course.createdBy || member_id === course.instructorId) {
      return reply.status(409).send({
        error: "course_restricted",
        message: "Criador ou instrutor nao pode se inscrever no curso",
      });
    }

    if (course.capacity !== null && course.enrollments.length >= course.capacity) {
      return reply.status(409).send({
        error: "course_full",
        message: "Vagas esgotadas",
      });
    }

    const enrollment = await addEnrollment(course, member_id);

    getUserById(member_id).then((member) => {
      if (member) {
        sendEnrollmentConfirmationEmail(course, member).catch((err) =>
          console.error("sendEnrollmentConfirmationEmail failed", err)
        );
      }
    }).catch((err) => console.error("getUserById failed for enrollment email", err));

    // GOOGLE_CALENDAR_DISABLED_START
    // // Adiciona evento no Google Calendar pessoal do membro (não-bloqueante)
    // prisma.user.findUnique({
    //   where: { id: member_id },
    //   select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
    // }).then((member) => {
    //   if (member?.googleAccessToken && member.googleRefreshToken) {
    //     createUserEvent(
    //       {
    //         accessToken: member.googleAccessToken,
    //         refreshToken: member.googleRefreshToken,
    //         tokenExpiry: member.googleTokenExpiry,
    //       },
    //       {
    //         title: course.title,
    //         description: course.description,
    //         location: course.location,
    //         courseDate: course.courseDate,
    //       }
    //     ).then((eventId) => {
    //       if (eventId) updateEnrollmentCalendarEventId(enrollment.id, eventId).catch(() => {});
    //     }).catch(() => {});
    //   }
    // }).catch(() => {});
    // GOOGLE_CALENDAR_DISABLED_END

    return reply.status(201).send({
      data: {
        id: enrollment.id,
        status: enrollment.status,
      },
    });
  });

  app.patch(
    "/api/v1/cursos/:id/inscricoes/:inscricaoId",
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Token ausente",
        });
      }

      const params = request.params as { id?: string; inscricaoId?: string };
      if (!params.id || !params.inscricaoId) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Inscricao invalida",
        });
      }

      const course = await getCourseById(params.id);
      if (!course) {
        return reply.status(404).send({
          error: "not_found",
          message: "Curso nao encontrado",
        });
      }

      if (
        request.user.role !== "admin" &&
        request.user.id !== course.instructorId
      ) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      const { status } = request.body as EnrollmentUpdateBody;
      if (!status || (status !== "attended" && status !== "missed")) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Status invalido",
        });
      }

      const enrollment = getEnrollmentById(course, params.inscricaoId);
      if (!enrollment) {
        return reply.status(404).send({
          error: "not_found",
          message: "Inscricao nao encontrada",
        });
      }

      const updated = await updateEnrollmentStatus(enrollment, status);

      return reply.status(200).send({
        data: {
          id: updated.id,
          status: updated.status,
        },
      });
    }
  );

  app.delete(
    "/api/v1/cursos/:id/inscricoes/:inscricaoId",
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Token ausente",
        });
      }

      const params = request.params as { id?: string; inscricaoId?: string };
      if (!params.id || !params.inscricaoId) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Inscricao invalida",
        });
      }

      const course = await getCourseById(params.id);
      if (!course) {
        return reply.status(404).send({
          error: "not_found",
          message: "Curso nao encontrado",
        });
      }

      const enrollment = getEnrollmentById(course, params.inscricaoId);
      if (!enrollment) {
        return reply.status(404).send({
          error: "not_found",
          message: "Inscricao nao encontrada",
        });
      }

      if (
        request.user.role !== "admin" &&
        request.user.id !== enrollment.memberId
      ) {
        return reply.status(403).send({
          error: "forbidden",
          message: "Acesso negado",
        });
      }

      if (enrollment.status !== "enrolled") {
        return reply.status(409).send({
          error: "invalid_request",
          message: "Apenas inscricoes pendentes podem ser canceladas",
        });
      }

      await removeEnrollment(enrollment.id);

      // GOOGLE_CALENDAR_DISABLED_START
      // // Remove evento do Google Calendar pessoal do membro (não-bloqueante)
      // if (enrollment.googleCalendarEventId) {
      //   const calEventId = enrollment.googleCalendarEventId;
      //   prisma.user.findUnique({
      //     where: { id: enrollment.memberId },
      //     select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
      //   }).then((member) => {
      //     if (member?.googleAccessToken && member.googleRefreshToken) {
      //       deleteUserEvent(
      //         {
      //           accessToken: member.googleAccessToken,
      //           refreshToken: member.googleRefreshToken,
      //           tokenExpiry: member.googleTokenExpiry,
      //         },
      //         calEventId
      //       ).catch(() => {});
      //     }
      //   }).catch(() => {});
      // }
      // GOOGLE_CALENDAR_DISABLED_END

      return reply.status(200).send({
        data: { id: enrollment.id },
      });
    }
  );

  interface FinalizeBody {
    enrollments?: Array<{ enrollment_id: string; status: string }>;
  }

  app.post("/api/v1/cursos/:id/finalizar", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Curso invalido",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const course = await getCourseById(params.id);
    if (!course) {
      return reply.status(404).send({
        error: "not_found",
        message: "Curso nao encontrado",
      });
    }

    if (
      request.user.role !== "admin" &&
      request.user.id !== course.instructorId
    ) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const body = request.body as FinalizeBody;
    if (!Array.isArray(body.enrollments) || body.enrollments.length === 0) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Lista de presencas obrigatoria",
      });
    }

    for (const item of body.enrollments) {
      if (!item.enrollment_id || (item.status !== "attended" && item.status !== "missed")) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Dados de presenca invalidos",
        });
      }
      if (!getEnrollmentById(course, item.enrollment_id)) {
        return reply.status(404).send({
          error: "not_found",
          message: "Inscricao nao encontrada",
        });
      }
    }

    await finalizeEnrollments(
      body.enrollments.map((item) => ({
        id: item.enrollment_id,
        status: item.status as EnrollmentStatus,
      }))
    );

    await archiveCourse(params.id);

    return reply.status(200).send({
      data: { finalized: body.enrollments.length },
    });
  });
}
