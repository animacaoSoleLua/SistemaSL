import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
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
        email: "admin@sol-e-lua.com",
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
        email: "novo-membro@sol-e-lua.com",
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
});
