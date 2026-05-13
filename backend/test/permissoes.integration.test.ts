import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { disconnectDatabase, resetDatabase, testAdmin } from "./helpers/db.js";

describe("Permissoes (integration)", () => {
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

  async function loginAdmin() {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testAdmin.email, password: testAdmin.password },
    });
    return res.json().data.access_token as string;
  }

  async function loginRecreador() {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });
    return res.json().data as { access_token: string; user: { id: string; permissions: string[] } };
  }

  it("admin can list empty permissions for a member", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual([]);
  });

  it("admin can grant permissions to a member", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks", "habilidades"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual(
      expect.arrayContaining(["feedbacks", "habilidades"])
    );
  });

  it("admin can revoke permissions by sending empty array", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks"] },
    });

    const revoke = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: [] },
    });

    expect(revoke.statusCode).toBe(200);
    expect(revoke.json().data.permissions).toEqual([]);
  });

  it("non-admin cannot access permissions routes", async () => {
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${recreadorData.access_token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("member with feedbacks permission can access feedbacks endpoint", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks"] },
    });

    // Re-login para obter token com permissões carregadas
    const relogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });
    const newToken = relogin.json().data.access_token as string;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/feedbacks",
      headers: { authorization: `Bearer ${newToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("member without feedbacks permission cannot access feedbacks endpoint", async () => {
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/feedbacks",
      headers: { authorization: `Bearer ${recreadorData.access_token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("login response includes permissions array", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["habilidades"] },
    });

    const relogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });

    expect(relogin.json().data.user.permissions).toEqual(["habilidades"]);
  });

  it("invalid permissions are silently ignored", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks", "permissao_inexistente"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual(["feedbacks"]);
  });
});
