import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { createReport, getReportById } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Relatorios media (integration)", () => {
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

  it("uploads media for own report", async () => {
    const user = await getUserByEmail("animador@sol-e-lua.com");
    const report = await createReport(user!.id);

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
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        media_type: "image",
        url: "https://cdn.sol-e-lua.com/foto.jpg",
        size_bytes: 1024,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.url).toBe("https://cdn.sol-e-lua.com/foto.jpg");
    expect(body.data.media_type).toBe("image");

    const stored = await getReportById(report.id);
    expect(stored?.media).toHaveLength(1);
  });

  it("rejects invalid media type", async () => {
    const user = await getUserByEmail("animador@sol-e-lua.com");
    const report = await createReport(user!.id);

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
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        media_type: "audio",
        url: "https://cdn.sol-e-lua.com/som.mp3",
        size_bytes: 1024,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("invalid_media_type");
  });

  it("rejects oversized video", async () => {
    const user = await getUserByEmail("animador@sol-e-lua.com");
    const report = await createReport(user!.id);

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
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        media_type: "video",
        url: "https://cdn.sol-e-lua.com/video.mp4",
        size_bytes: 60 * 1024 * 1024,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("file_too_large");
  });

  it("blocks uploading to report from another user", async () => {
    const admin = await getUserByEmail("admin@sol-e-lua.com");
    const report = await createReport(admin!.id);

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
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        media_type: "image",
        url: "https://cdn.sol-e-lua.com/foto.jpg",
        size_bytes: 1024,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
