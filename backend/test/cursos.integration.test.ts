import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Cursos (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  it("allows admin to create course, enroll member, and mark attendance", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Som",
        description: "Treinamento tecnico",
        course_date: "2026-02-01",
        location: "Sala 1",
        capacity: 1,
        instructor_id: adminUser!.id,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const courseId = createResponse.json().data.id;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/cursos?status=available",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const listData = listResponse.json().data;
    expect(listData.some((course: { id: string }) => course.id === courseId)).toBe(
      true
    );

    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;
    const member = await getUserByEmail("animador@sol-e-lua.com");

    const enrollResponse = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${courseId}/inscricoes`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { member_id: member!.id },
    });

    expect(enrollResponse.statusCode).toBe(201);
    const enrollmentId = enrollResponse.json().data.id;

    const recreador = await getUserByEmail("recreador@sol-e-lua.com");
    const loginRecreador = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "recreador@sol-e-lua.com",
        password: "recreador123",
      },
    });
    const recreadorToken = loginRecreador.json().data.access_token;

    const fullResponse = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${courseId}/inscricoes`,
      headers: { authorization: `Bearer ${recreadorToken}` },
      payload: { member_id: recreador!.id },
    });

    expect(fullResponse.statusCode).toBe(409);

    const attendanceResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/cursos/${courseId}/inscricoes/${enrollmentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "attended" },
    });

    expect(attendanceResponse.statusCode).toBe(200);
    expect(attendanceResponse.json().data.status).toBe("attended");

    const profileResponse = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profileResponse.statusCode).toBe(200);
    const courses = profileResponse.json().data.courses;
    expect(
      courses.some(
        (course: { id: string; status: string }) =>
          course.id === courseId && course.status === "attended"
      )
    ).toBe(true);
  });

  it("allows animador to create course", async () => {
    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${memberToken}` },
      payload: {
        title: "Curso de Teatro",
        description: "Expressao corporal",
        course_date: "2026-04-01",
        location: "Sala 3",
        capacity: 12,
        instructor_id: adminUser!.id,
      },
    });

    expect(createResponse.statusCode).toBe(201);
  });

  it("blocks member from enrolling another member or updating attendance", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Iluminacao",
        description: "Basico",
        course_date: "2026-03-01",
        location: "Sala 2",
        capacity: 2,
        instructor_id: adminUser!.id,
      },
    });
    const courseId = createResponse.json().data.id;

    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;

    const recreador = await getUserByEmail("recreador@sol-e-lua.com");
    const forbiddenEnroll = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${courseId}/inscricoes`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { member_id: recreador!.id },
    });

    expect(forbiddenEnroll.statusCode).toBe(403);

    const member = await getUserByEmail("animador@sol-e-lua.com");
    const enrollResponse = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${courseId}/inscricoes`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { member_id: member!.id },
    });
    const enrollmentId = enrollResponse.json().data.id;

    const forbiddenAttendance = await app.inject({
      method: "PATCH",
      url: `/api/v1/cursos/${courseId}/inscricoes/${enrollmentId}`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { status: "attended" },
    });

    expect(forbiddenAttendance.statusCode).toBe(403);
  });

  it("blocks creator or instructor from enrolling in their own course", async () => {
    const loginAnimador = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const animadorToken = loginAnimador.json().data.access_token;
    const animadorUser = await getUserByEmail("animador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: {
        title: "Curso de Jogos",
        description: "Dinamicas em grupo",
        course_date: "2026-05-01",
        location: "Sala 4",
        capacity: 5,
        instructor_id: animadorUser!.id,
      },
    });
    const courseId = createResponse.json().data.id;

    const creatorEnroll = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${courseId}/inscricoes`,
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: { member_id: animadorUser!.id },
    });

    expect(creatorEnroll.statusCode).toBe(409);

    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = adminLogin.json().data.access_token;

    const adminCourseResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Fantasia",
        description: "Teatro e figurino",
        course_date: "2026-06-01",
        location: "Sala 5",
        capacity: 3,
        instructor_id: animadorUser!.id,
      },
    });
    const adminCourseId = adminCourseResponse.json().data.id;

    const instructorEnroll = await app.inject({
      method: "POST",
      url: `/api/v1/cursos/${adminCourseId}/inscricoes`,
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: { member_id: animadorUser!.id },
    });

    expect(instructorEnroll.statusCode).toBe(409);
  });

  it("allows admin to update and delete course", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Ritmo",
        description: "Basico",
        course_date: "2026-07-01",
        location: "Sala 6",
        capacity: 6,
        instructor_id: adminUser!.id,
      },
    });
    const courseId = createResponse.json().data.id;

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Ritmo Avancado",
        capacity: 8,
      },
    });

    expect(updateResponse.statusCode).toBe(200);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().data.title).toBe("Curso de Ritmo Avancado");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(deleteResponse.statusCode).toBe(200);

    const missingResponse = await app.inject({
      method: "GET",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(missingResponse.statusCode).toBe(404);
  });

  it("blocks animador from updating or deleting course they did not create", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso de Voz",
        description: "Basico",
        course_date: "2026-08-01",
        location: "Sala 7",
        capacity: 4,
        instructor_id: adminUser!.id,
      },
    });
    const courseId = createResponse.json().data.id;

    const loginAnimador = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const animadorToken = loginAnimador.json().data.access_token;

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: { title: "Curso de Voz II" },
    });

    expect(updateResponse.statusCode).toBe(403);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/cursos/${courseId}`,
      headers: { authorization: `Bearer ${animadorToken}` },
    });

    expect(deleteResponse.statusCode).toBe(403);
  });

  it("allows admin to import a historical course with attendees", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos/importar",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso Histórico",
        description: "Importado manualmente",
        course_date: "2024-06-15T10:00",
        location: "Sala A",
        instructor_id: adminUser!.id,
        members: [
          { member_id: adminUser!.id, status: "attended" },
        ],
      },
    });

    expect(importResponse.statusCode).toBe(201);
    const body = importResponse.json();
    expect(body.data.id).toBeDefined();
    expect(body.data.imported_count).toBe(1);

    // Curso deve aparecer nos arquivados
    const listArchived = await app.inject({
      method: "GET",
      url: "/api/v1/cursos?status=archived",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listArchived.statusCode).toBe(200);
    const archivedList = listArchived.json().data;
    expect(archivedList.some((c: { id: string }) => c.id === body.data.id)).toBe(true);
  });

  it("rejects import with duplicate member_id", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos/importar",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso Duplicado",
        course_date: "2024-05-01T08:00",
        instructor_id: adminUser!.id,
        members: [
          { member_id: adminUser!.id, status: "attended" },
          { member_id: adminUser!.id, status: "missed" },
        ],
      },
    });

    expect(importResponse.statusCode).toBe(400);
    expect(importResponse.json().error).toBe("invalid_request");
  });

  it("rejects import without authentication", async () => {
    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos/importar",
      payload: {
        title: "Sem auth",
        course_date: "2024-01-01T10:00",
        instructor_id: "00000000-0000-0000-0000-000000000000",
        members: [],
      },
    });
    expect(importResponse.statusCode).toBe(401);
  });

  it("filters courses by period_start and period_end", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso Fevereiro",
        course_date: "2026-02-15T10:00",
        instructor_id: adminUser!.id,
      },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/cursos",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Curso Marco",
        course_date: "2026-03-10T10:00",
        instructor_id: adminUser!.id,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/cursos?period_start=2026-02-01&period_end=2026-02-28&status=all",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data as Array<{ title: string }>;
    expect(data.some((c) => c.title === "Curso Fevereiro")).toBe(true);
    expect(data.some((c) => c.title === "Curso Marco")).toBe(false);
  });

  it("rejects import by recreador", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

    // Cria um recreador
    const createRecreador = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Recreador Teste",
        email: "recreador@teste.com",
        password: "Senha123",
        role: "recreador",
        cpf: "000.000.000-00",
        region: "DF",
        phone: "(61) 00000-0001",
        birthDate: "2000-01-01",
      },
    });
    expect(createRecreador.statusCode).toBe(201);

    const loginRecredor = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@teste.com", password: "Senha123" },
    });
    const recreadorToken = loginRecredor.json().data.access_token;

    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/cursos/importar",
      headers: { authorization: `Bearer ${recreadorToken}` },
      payload: {
        title: "Tentativa",
        course_date: "2024-01-01T10:00",
        instructor_id: adminUser!.id,
        members: [],
      },
    });
    expect(importResponse.statusCode).toBe(403);
  });
});
