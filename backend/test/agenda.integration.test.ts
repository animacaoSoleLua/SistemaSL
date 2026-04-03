import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Agenda (integration)", () => {
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

  it("requires authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/agenda/events",
    });
    expect(response.statusCode).toBe(401);
  });

  it("returns empty array when user has no Google tokens", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suporte@gmail.com", password: "Senha123" },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/agenda/events",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it("returns 422 on POST when user has no Google tokens", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suporte@gmail.com", password: "Senha123" },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/agenda/events",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Reunião",
        start: "2026-04-10T10:00:00",
        end: "2026-04-10T11:00:00",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error).toBe("google_not_connected");
  });

  it("returns 422 on PATCH when user has no Google tokens", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suporte@gmail.com", password: "Senha123" },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/agenda/events/some-event-id",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Reunião editada",
        start: "2026-04-10T10:00:00",
        end: "2026-04-10T11:00:00",
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it("returns 422 on DELETE when user has no Google tokens", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suporte@gmail.com", password: "Senha123" },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/agenda/events/some-event-id",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(422);
  });

  it("returns 400 on POST with invalid body", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suporte@gmail.com", password: "Senha123" },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/agenda/events",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "" }, // missing start/end, empty title
    });

    expect(response.statusCode).toBe(400);
  });
});
