import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
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
        email: "arthurssousa2004@gmail.com",
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
        email: "arthurssousa2004@gmail.com",
        password: "wrong",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("registers new user with allowed role", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        name: "Joana",
        last_name: "Silva",
        cpf: "390.533.447-05",
        email: "joana@sol-e-lua.com",
        birth_date: "1998-05-12",
        region: "Ceilândia",
        phone: "(61) 98888-7777",
        role: "recreador",
        password: "segredo123",
      },
    });

    expect(response.statusCode).toBe(201);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "joana@sol-e-lua.com",
        password: "segredo123",
      },
    });

    expect(login.statusCode).toBe(200);
    expect(login.json().data.user.role).toBe("recreador");
  });

  it("resets password with email + token flow", async () => {
    const requestToken = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: {
        email: "animador@sol-e-lua.com",
      },
    });

    const requestBody = requestToken.json();
    expect(requestToken.statusCode).toBe(200);
    expect(requestBody.data.sent).toBe(true);
    expect(requestBody.data.debug_token).toBeTypeOf("string");

    const token = requestBody.data.debug_token as string;

    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-reset-token",
      payload: {
        email: "animador@sol-e-lua.com",
        token,
      },
    });

    expect(verify.statusCode).toBe(200);
    expect(verify.json().data.valid).toBe(true);

    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: {
        email: "animador@sol-e-lua.com",
        token,
        novaSenha: "novaSenha123",
        novaSenhaConfirmacao: "novaSenha123",
      },
    });

    expect(reset.statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "novaSenha123",
      },
    });

    expect(login.statusCode).toBe(200);
  });

  it("blocks admin role on public register", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        name: "Admin",
        last_name: "Teste",
        cpf: "529.982.247-25",
        email: "admin-public@sol-e-lua.com",
        birth_date: "1990-01-01",
        region: "Gama",
        phone: "(61) 90000-0000",
        role: "admin",
        password: "segredo123",
      },
    });

    expect(response.statusCode).toBe(400);
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
        email: "arthurssousa2004@gmail.com",
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
