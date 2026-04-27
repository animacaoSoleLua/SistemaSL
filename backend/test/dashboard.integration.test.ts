import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { createReport } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Dashboard (integration)", () => {
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

  it("returns resumo with period filter", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      teamSummary: "Equipe A",
      teamGeneralScore: 3,
      qualitySound: 4,
      qualityMicrophone: 5,
      outsideBrasilia: true,
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-02-10"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
      qualitySound: 2,
    });

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
      url: "/api/v1/dashboard/resumo?period_start=2026-01-01&period_end=2026-01-31",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.total_events).toBe(1);
    expect(body.data.total_reports).toBe(1);
    expect(body.data.avg_quality).toBe(3);
    expect(body.data.outside_brasilia_events).toBe(1);
  });

  it("returns animadores ordered by events", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      teamSummary: "Equipe A",
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
    });
    await createReport(admin!.id, {
      eventDate: new Date("2026-01-12"),
      contractorName: "Outro",
      teamSummary: "Equipe C",
    });

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
      url: "/api/v1/dashboard/animadores",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].animador).toBe("Animador");
    expect(body.data[0].events).toBe(2);
  });

  it("filters animadores by period", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-05"),
      contractorName: "Hotel Sol",
      teamSummary: "Equipe A",
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-02-05"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
    });

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
      url: "/api/v1/dashboard/animadores?period_start=2026-01-01&period_end=2026-01-31",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].events).toBe(1);
  });

  it("returns qualidade averages", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      teamSummary: "Equipe A",
      eventQualityScore: 4,
      eventDifficultyScore: 2,
      qualitySound: 4,
      qualityMicrophone: 3,
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
      eventQualityScore: 2,
      eventDifficultyScore: 4,
      qualitySound: 2,
      qualityMicrophone: 5,
    });

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
      url: "/api/v1/dashboard/qualidade",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.sound).toBe(3);
    expect(body.data.microphone).toBe(4);
    expect(body.data.event_quality).toBe(3);
    expect(body.data.event_difficulty).toBe(3);
  });

  it("filters qualidade by period", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      teamSummary: "Equipe A",
      eventQualityScore: 5,
      eventDifficultyScore: 1,
      qualitySound: 4,
      qualityMicrophone: 3,
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-02-11"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
      eventQualityScore: 2,
      eventDifficultyScore: 4,
      qualitySound: 2,
      qualityMicrophone: 5,
    });

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
      url: "/api/v1/dashboard/qualidade?period_start=2026-01-01&period_end=2026-01-31",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.sound).toBe(4);
    expect(body.data.microphone).toBe(3);
    expect(body.data.event_quality).toBe(5);
    expect(body.data.event_difficulty).toBe(1);
  });

  it("rejects invalid period range", async () => {
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
      url: "/api/v1/dashboard/resumo?period_start=2026-02-01&period_end=2026-01-01",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe("Periodo inicial maior que final");
  });

  it("blocks non-admin access", async () => {
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
      url: "/api/v1/dashboard/resumo",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
  });
});
