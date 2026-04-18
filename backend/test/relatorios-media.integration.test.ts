import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { createReport, getReportById } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

vi.mock("../src/lib/r2.js", () => ({
  uploadToR2: vi.fn(
    async ({ stream, key, maxSize }: { stream: NodeJS.ReadableStream; key: string; maxSize: number }) => {
      const chunks: Buffer[] = [];
      let sizeBytes = 0;
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        sizeBytes += chunk.length;
        if (sizeBytes > maxSize) throw new Error("file_too_large");
        chunks.push(chunk);
      }
      return { url: `${process.env.R2_PUBLIC_URL}/${key}`, sizeBytes };
    }
  ),
  deleteFromR2: vi.fn(async () => {}),
}));

function buildMultipartPayload(options: {
  fields?: Record<string, string>;
  file: {
    fieldName: string;
    filename: string;
    contentType: string;
    data: Buffer;
  };
}) {
  const boundary = `----sol-e-lua-${Date.now()}`;
  const chunks: Buffer[] = [];

  const push = (value: string | Buffer) => {
    chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  };

  for (const [name, value] of Object.entries(options.fields ?? {})) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
    push(`${value}\r\n`);
  }

  push(`--${boundary}\r\n`);
  push(
    `Content-Disposition: form-data; name="${options.file.fieldName}"; filename="${options.file.filename}"\r\n`
  );
  push(`Content-Type: ${options.file.contentType}\r\n\r\n`);
  push(options.file.data);
  push("\r\n");
  push(`--${boundary}--\r\n`);

  return {
    payload: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

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

    const { payload, contentType } = buildMultipartPayload({
      fields: { media_type: "image" },
      file: {
        fieldName: "file",
        filename: "foto.jpg",
        contentType: "image/jpeg",
        data: Buffer.from("imagem de teste"),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.url).toContain(`${process.env.R2_PUBLIC_URL}/relatorios/${report.id}/`);
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

    const { payload, contentType } = buildMultipartPayload({
      fields: { media_type: "audio" },
      file: {
        fieldName: "file",
        filename: "som.mp3",
        contentType: "audio/mpeg",
        data: Buffer.from("som de teste"),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
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

    const { payload, contentType } = buildMultipartPayload({
      fields: { media_type: "video" },
      file: {
        fieldName: "file",
        filename: "video.mp4",
        contentType: "video/mp4",
        data: Buffer.alloc(51 * 1024 * 1024, 0),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("file_too_large");
  });

  it("blocks uploading to report from another user", async () => {
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");
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

    const { payload, contentType } = buildMultipartPayload({
      fields: { media_type: "image" },
      file: {
        fieldName: "file",
        filename: "foto.jpg",
        contentType: "image/jpeg",
        data: Buffer.from("imagem de teste"),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/relatorios/${report.id}/media`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(403);
  });
});
