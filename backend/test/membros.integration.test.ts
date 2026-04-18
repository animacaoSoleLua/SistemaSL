import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { createReport } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Membros (integration)", () => {
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

  it("allows admin to create, view, update, and delete member", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/membros",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Novo Membro",
        last_name: "Silva",
        cpf: "390.533.447-05",
        email: "novo-membro@sol-e-lua.com",
        birth_date: "1997-03-22",
        region: "Ceilândia",
        phone: "(61) 99999-1111",
        role: "recreador",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json().data;

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().data.courses).toEqual([]);

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/membros/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "animador", photo_url: "https://foto.test/x.png" },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().data.name).toBe("Novo Membro");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/membros?search=novo",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const listData = listResponse.json().data;
    expect(listData.some((member: { id: string }) => member.id === created.id)).toBe(
      true
    );

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(deleteResponse.statusCode).toBe(204);
  });

  it("deletes member even with related records", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/membros",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Membro com registros",
        last_name: "Souza",
        cpf: "529.982.247-25",
        email: "membro-registros@sol-e-lua.com",
        birth_date: "1996-02-12",
        region: "Gama",
        phone: "(61) 99999-2222",
        role: "animador",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json().data;

    const warningResponse = await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        member_id: created.id,
        reason: "Registro de teste",
        warning_date: "2026-01-10",
      },
    });

    expect(warningResponse.statusCode).toBe(201);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/membros?search=registros",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const listData = listResponse.json().data;
    expect(listData.some((member: { id: string }) => member.id === created.id)).toBe(
      false
    );
  });

  it("allows member to update own profile without role change", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/membros/${animador!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Animador Atualizado", photo_url: "https://foto.test/a.png" },
    });

    expect(updateResponse.statusCode).toBe(200);

    const forbiddenResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/membros/${animador!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "admin" },
    });

    expect(forbiddenResponse.statusCode).toBe(403);
  });

  it("removes profile photo persistently", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    expect(animador).toBeDefined();

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const setPhotoResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/membros/${animador!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { photo_url: "https://foto.test/persistente.png" },
    });
    expect(setPhotoResponse.statusCode).toBe(200);

    const removePhotoResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${animador!.id}/foto`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(removePhotoResponse.statusCode).toBe(200);
    expect(removePhotoResponse.json().data.photo_url).toBeNull();

    const detailAfterRemove = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${animador!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(detailAfterRemove.statusCode).toBe(200);
    expect(detailAfterRemove.json().data.photo_url).toBeNull();
  });

  it("returns report feedbacks with author_name for admin", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const token = login.json().data.access_token;
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");
    expect(admin).toBeDefined();

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/membros",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Recreador",
        last_name: "Teste",
        email: "recreador-feedback@sol-e-lua.com",
        role: "recreador",
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const member = createResponse.json().data;

    await createReport(admin!.id, {
      eventDate: new Date("2026-03-15"),
      contractorName: "Clube Teste",
      location: "Brasília",
      teamSummary: "Equipe bem entrosada",
      feedbacks: [
        { memberId: member.id, feedback: "Excelente desempenho no evento" },
      ],
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    const feedbacks = detailResponse.json().data.feedbacks as Array<{
      id: string;
      feedback: string;
      author_name: string;
      event_date: string;
    }>;
    expect(feedbacks).toHaveLength(1);
    expect(feedbacks[0].feedback).toBe("Excelente desempenho no evento");
    expect(feedbacks[0].author_name).toBe(
      [admin!.name, admin!.lastName].filter(Boolean).join(" ")
    );
    expect(feedbacks[0].event_date).toBe("2026-03-15");
  });
});
