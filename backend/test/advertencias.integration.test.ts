import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

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

  it("allows admin to create warnings and member sees suspension after three", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;

    const member = await getUserByEmail("animador@sol-e-lua.com");

    const warningDates = ["2026-01-10", "2026-01-11", "2026-01-12"];
    for (const warningDate of warningDates) {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          member_id: member!.id,
          reason: "Conduta inadequada",
          warning_date: warningDate,
        },
      });

      expect(createResponse.statusCode).toBe(201);
    }

    const listAdmin = await app.inject({
      method: "GET",
      url: `/api/v1/advertencias?member_id=${member!.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listAdmin.statusCode).toBe(200);
    expect(listAdmin.json().data).toHaveLength(3);

    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;

    const listMember = await app.inject({
      method: "GET",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(listMember.statusCode).toBe(200);
    expect(listMember.json().data).toHaveLength(3);

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

  it("does not suspend if three warnings are not within one month", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;

    const member = await getUserByEmail("recreador@sol-e-lua.com");

    const warningDates = ["2026-01-01", "2026-01-15", "2026-02-16"];
    for (const warningDate of warningDates) {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/advertencias",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          member_id: member!.id,
          reason: "Atraso",
          warning_date: warningDate,
        },
      });

      expect(createResponse.statusCode).toBe(201);
    }

    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "recreador@sol-e-lua.com",
        password: "recreador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;

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

  it("allows admin to delete a warning", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@sol-e-lua.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;

    const member = await getUserByEmail("recreador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        member_id: member!.id,
        reason: "Falta",
        warning_date: "2026-02-01",
      },
    });

    const warningId = createResponse.json().data.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/advertencias/${warningId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(deleteResponse.statusCode).toBe(204);

    const listMember = await app.inject({
      method: "GET",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listMember.statusCode).toBe(200);
    expect(listMember.json().data).toHaveLength(0);
  });

  it("allows animador to list warnings they created", async () => {
    const loginAnimador = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const animadorToken = loginAnimador.json().data.access_token;

    const recreador = await getUserByEmail("recreador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${animadorToken}` },
      payload: {
        member_id: recreador!.id,
        reason: "Atraso",
        warning_date: "2026-03-01",
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/advertencias?created_by=me",
      headers: { authorization: `Bearer ${animadorToken}` },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toHaveLength(1);
  });
});
