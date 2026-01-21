import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { createReport } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Relatorios (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates report with feedbacks and returns detail", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const recreador = await getUserByEmail("recreador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-10",
        contractor_name: "Hotel Sol",
        location: "Brasilia",
        team_summary: "Equipe A",
        quality_sound: 4,
        quality_microphone: 5,
        notes: "Tudo certo",
        feedbacks: [
          { member_id: recreador!.id, feedback: "Bom trabalho" },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const reportId = createResponse.json().data.id;

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    const body = detailResponse.json();
    expect(body.data.contractor_name).toBe("Hotel Sol");
    expect(body.data.feedbacks).toHaveLength(1);
    expect(body.data.feedbacks[0].member_id).toBe(recreador!.id);
  });

  it("lists only own reports for animador", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    const admin = await getUserByEmail("admin@sol-e-lua.com");

    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      location: "Brasilia",
      teamSummary: "Equipe A",
    });
    await createReport(admin!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Clube Lua",
      location: "Goiania",
      teamSummary: "Equipe B",
    });

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
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].author_id).toBe(animador!.id);
  });

  it("exports report as PDF for the owner", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-10",
        contractor_name: "Hotel Sol",
        location: "Brasilia",
        team_summary: "Equipe A",
      },
    });

    const reportId = createResponse.json().data.id;
    const pdfResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}/pdf`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(pdfResponse.statusCode).toBe(200);
    expect(pdfResponse.headers["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers["content-disposition"]).toContain(
      `relatorio-${reportId}.pdf`
    );
    expect(pdfResponse.body.startsWith("%PDF")).toBe(true);
  });

  it("allows admin to filter by author and search", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    const admin = await getUserByEmail("admin@sol-e-lua.com");

    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      location: "Brasilia",
      teamSummary: "Equipe A",
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-12"),
      contractorName: "Clube Lua",
      location: "Brasilia",
      teamSummary: "Equipe B",
    });
    await createReport(admin!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Outro",
      location: "Anapolis",
      teamSummary: "Equipe C",
    });

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
      url: `/api/v1/relatorios?author_id=${animador!.id}&search=hotel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contractor_name).toBe("Hotel Sol");
  });
});
