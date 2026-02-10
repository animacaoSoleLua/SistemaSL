import { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  addEnrollment,
  createCourse,
  deleteCourse,
  EnrollmentStatus,
  getCourseById,
  getEnrollmentById,
  getEnrollmentByMember,
  listCourses,
  updateCourse,
  updateEnrollmentStatus,
} from "./store.js";

interface CourseBody {
  title?: string;
  description?: string;
  course_date?: string;
  location?: string;
  capacity?: number;
  instructor_id?: string;
}

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
  return value === "available" || value === "full" || value === "all";
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

    if (query.status && !isValidStatusFilter(query.status)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Status invalido",
      });
    }

    let courses = await listCourses();

    if (query.status && query.status !== "all") {
      courses = courses.filter((course) => {
        const remaining = course.capacity - course.enrollments.length;
        if (query.status === "available") {
          return remaining > 0;
        }
        return remaining <= 0;
      });
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
        available_spots: Math.max(
          course.capacity - course.enrollments.length,
          0
        ),
      })),
    });
  });

  app.post(
    "/api/v1/cursos",
    { preHandler: requireRole(["admin", "animador"]) },
    async (request, reply) => {
      const { title, description, course_date, location, capacity, instructor_id } =
        request.body as CourseBody;

      if (!title || !course_date || capacity === undefined || !instructor_id) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Titulo, data, vagas e instrutor sao obrigatorios",
        });
      }

      const courseDate = parseDate(course_date);
      if (!courseDate) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Data do curso invalida",
        });
      }

      if (!Number.isInteger(capacity) || capacity <= 0) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Vagas invalidas",
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

      const { title, description, course_date, location, capacity, instructor_id } =
        request.body as CourseBody;

      if (capacity !== undefined) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
          return reply.status(400).send({
            error: "invalid_request",
            message: "Vagas invalidas",
          });
        }
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

      await deleteCourse(course.id);

      return reply.status(200).send({
        data: { id: course.id },
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
      available_spots: Math.max(course.capacity - course.enrollments.length, 0),
    };

    if (request.user.role === "admin") {
      return reply.status(200).send({
        data: {
          ...base,
          enrollments: course.enrollments.map((enrollment) => ({
            id: enrollment.id,
            member_id: enrollment.memberId,
            status: enrollment.status,
          })),
        },
      });
    }

    const enrollment = getEnrollmentByMember(course, request.user.id);
    return reply.status(200).send({
      data: {
        ...base,
        enrollment: enrollment
          ? { id: enrollment.id, status: enrollment.status }
          : null,
      },
    });
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

    if (course.enrollments.length >= course.capacity) {
      return reply.status(409).send({
        error: "course_full",
        message: "Vagas esgotadas",
      });
    }

    const enrollment = await addEnrollment(course, member_id);

    return reply.status(201).send({
      data: {
        id: enrollment.id,
        status: enrollment.status,
      },
    });
  });

  app.patch(
    "/api/v1/cursos/:id/inscricoes/:inscricaoId",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
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
}
