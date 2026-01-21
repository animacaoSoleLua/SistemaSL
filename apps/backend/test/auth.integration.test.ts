import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { createResetToken, getUserByEmail } from "../src/auth/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Auth (integration)", () => {
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

  it("logs in and returns token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "admin123",
      },
    });

    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(body.data.access_token).toBeTypeOf("string");
    expect(body.data.user.role).toBe("admin");
  });

  it("rejects invalid login", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "wrong",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("sends forgot password message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email: "admin@sol-e-lua.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { message: "Email enviado" } });
  });

  it("resets password with valid token", async () => {
    const user = await getUserByEmail("recreador@sol-e-lua.com");
    const token = createResetToken(user!.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token, password: "nova123" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { message: "Senha atualizada" } });

    const updated = await getUserByEmail("recreador@sol-e-lua.com");
    expect(updated?.passwordHash).toMatch(/^scrypt\$/);
  });

  it("protects routes without token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/secure/ping",
    });

    expect(response.statusCode).toBe(401);
  });

  it("blocks non-admin role on admin route", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });

    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/ping",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("allows admin role on admin route", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "admin123",
      },
    });

    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/ping",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
