import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import {
  disconnectDatabase,
  resetDatabase,
  testAdmin,
  testMember1,
  testMember2,
  testMember3,
} from "./helpers/db.js";

describe("Advertencias (integration)", () => {
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

  async function loginAs(email: string, password: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    return res.json().data.access_token;
  }

  it("3 advertências no mesmo mês geram suspensão", async () => {
    const adminToken = await loginAs(testAdmin.email, testAdmin.password);
    const member = await getUserByEmail(testMember1.email);

    for (const date of ["2026-04-01", "2026-04-05", "2026-04-09"]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { member_id: member!.id, reason: "Conduta inadequada", warning_date: date },
      });
      expect(res.statusCode).toBe(201);
    }

    const memberToken = await loginAs(testMember1.email, testMember1.password);
    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profile.statusCode).toBe(200);
    const profileData = profile.json().data;
    expect(profileData.warnings_total).toBe(3);
    expect(profileData.suspension.status).toBe("suspended");
  });

  it("3 advertências cross-mês dentro de 1 mês geram suspensão (ex: 30/03, 10/04, 09/04)", async () => {
    const adminToken = await loginAs(testAdmin.email, testAdmin.password);
    const member = await getUserByEmail(testMember2.email);

    for (const date of ["2026-03-10", "2026-03-30", "2026-04-09"]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { member_id: member!.id, reason: "Atraso recorrente", warning_date: date },
      });
      expect(res.statusCode).toBe(201);
    }

    const memberToken = await loginAs(testMember2.email, testMember2.password);
    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profile.statusCode).toBe(200);
    const profileData = profile.json().data;
    expect(profileData.warnings_total).toBe(3);
    expect(profileData.suspension.status).toBe("suspended");
  });

  it("3 advertências com intervalo > 1 mês não geram suspensão", async () => {
    const adminToken = await loginAs(testAdmin.email, testAdmin.password);
    const member = await getUserByEmail(testMember3.email);

    // Jan 1 fica fora da janela de [Jan 16, Feb 16]
    for (const date of ["2026-01-01", "2026-01-15", "2026-02-16"]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { member_id: member!.id, reason: "Atraso", warning_date: date },
      });
      expect(res.statusCode).toBe(201);
    }

    const memberToken = await loginAs(testMember3.email, testMember3.password);
    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profile.statusCode).toBe(200);
    const profileData = profile.json().data;
    expect(profileData.warnings_total).toBe(3);
    expect(profileData.suspension.status).toBe("active");
  });

  it("deletar advertência remove a suspensão se restarem menos de 3 na janela", async () => {
    const adminToken = await loginAs(testAdmin.email, testAdmin.password);
    const member = await getUserByEmail(testMember1.email);

    const warningIds: string[] = [];
    for (const date of ["2026-03-10", "2026-03-20", "2026-04-01"]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { member_id: member!.id, reason: "Falta", warning_date: date },
      });
      expect(res.statusCode).toBe(201);
      warningIds.push(res.json().data.id);
    }

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/advertencias/${warningIds[0]}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const memberToken = await loginAs(testMember1.email, testMember1.password);
    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profile.statusCode).toBe(200);
    expect(profile.json().data.suspension.status).toBe("active");
  });

  it("animador pode criar advertência e vê apenas as próprias via created_by=me", async () => {
    const animadorToken = await loginAs(testMember2.email, testMember2.password);
    const target = await getUserByEmail(testMember3.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: { member_id: target!.id, reason: "Atraso injustificado", warning_date: "2026-03-01" },
    });
    expect(createRes.statusCode).toBe(201);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/advertencias?created_by=me",
      headers: { authorization: `Bearer ${animadorToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data).toHaveLength(1);
  });

  it("profile warnings include created_by_name", async () => {
    const adminToken = await loginAs(testAdmin.email, testAdmin.password);
    const admin = await getUserByEmail(testAdmin.email);

    const member = await getUserByEmail(testMember1.email);

    await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        member_id: member!.id,
        reason: "Teste de autor",
        warning_date: "2026-02-01",
      },
    });

    // Use adminToken to stay within the in-process login rate limit.
    // (The per-route keyGenerator reads request.body at onRequest time when body is
    // not yet parsed, so the IP-based fallback fires; after 10 prior logins in this
    // suite the 11th would hit 429.)
    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(profile.statusCode).toBe(200);
    const profileData = profile.json().data;
    expect(profileData.warnings).toHaveLength(1);
    const expectedName = [admin!.name, admin!.lastName].filter(Boolean).join(" ");
    expect(profileData.warnings[0].created_by_name).toBe(expectedName);
  });
});
