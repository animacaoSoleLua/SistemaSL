import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  addMediaToReport,
  createReport,
  getReportById,
  listReports,
  MediaType,
} from "./store.js";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const uploadsRoot = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : join(process.cwd(), "uploads");

const mediaExtensions: Record<MediaType, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".mov", ".webm"],
};

const mediaMimeExtensions: Record<MediaType, Record<string, string>> = {
  image: {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  },
  video: {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  },
};

interface ReportBody {
  event_date?: string;
  contractor_name?: string;
  location?: string;
  team_summary?: string;
  quality_sound?: number;
  quality_microphone?: number;
  notes?: string;
  feedbacks?: Array<{
    member_id?: string;
    feedback?: string;
  }>;
}

interface ReportQuery {
  period_start?: string;
  period_end?: string;
  author_id?: string;
  search?: string;
  page?: string;
  limit?: string;
}

function maxSizeForType(type: MediaType): number {
  return type === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
}

function parseMediaType(
  value?: string,
  mimetype?: string
): MediaType | undefined {
  if (value === "image" || value === "video") {
    return value;
  }
  if (!value && mimetype) {
    if (mimetype.startsWith("image/")) {
      return "image";
    }
    if (mimetype.startsWith("video/")) {
      return "video";
    }
  }
  return undefined;
}

function resolveExtension(
  filename: string,
  mediaType: MediaType,
  mimetype?: string
): string | undefined {
  const extension = extname(filename).toLowerCase();
  if (extension && mediaExtensions[mediaType].includes(extension)) {
    return extension;
  }
  const mimeExtension = mimetype
    ? mediaMimeExtensions[mediaType][mimetype]
    : undefined;
  if (mimeExtension) {
    return mimeExtension;
  }
  return undefined;
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore errors while cleaning up temporary files
  }
}

async function saveUploadToDisk(options: {
  stream: NodeJS.ReadableStream;
  targetPath: string;
  maxSize: number;
}): Promise<number> {
  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > options.maxSize) {
        callback(new Error("file_too_large"));
        return;
      }
      callback(null, chunk);
    },
  });

  await mkdir(dirname(options.targetPath), { recursive: true });

  try {
    await pipeline(options.stream, counter, createWriteStream(options.targetPath));
  } catch (error) {
    await safeUnlink(options.targetPath);
    throw error;
  }

  return size;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizePdfText(value: string): string {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
  return ascii;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfContent(lines: string[]): string {
  const sanitized = lines.map((line) =>
    escapePdfText(normalizePdfText(line.trim()))
  );

  const contentLines = sanitized.length ? sanitized : ["Relatorio"];
  let content = "BT\n/F1 12 Tf\n72 720 Td\n";
  content += `(${contentLines[0]}) Tj\n`;

  for (const line of contentLines.slice(1)) {
    content += "0 -16 Td\n";
    content += `(${line}) Tj\n`;
  }

  content += "ET";
  return content;
}

function buildPdfDocument(lines: string[]): Buffer {
  const content = buildPdfContent(lines);
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "xref\n0 6\n";
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n<< /Size 6 /Root 1 0 R >>\n";
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}

function isValidRating(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

export async function relatoriosRoutes(app: FastifyInstance) {
  app.get("/api/v1/relatorios", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as ReportQuery;
    const periodStart = parseDate(query.period_start);
    const periodEnd = parseDate(query.period_end);

    if (query.period_start && !periodStart) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo inicial invalido",
      });
    }

    if (query.period_end && !periodEnd) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo final invalido",
      });
    }

    const parsedPage = parsePositiveInt(query.page);
    const parsedLimit = parsePositiveInt(query.limit);
    const page = parsedPage ?? 1;
    const limit = parsedLimit ?? 20;

    if (query.page && parsedPage === undefined) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Pagina invalida",
      });
    }

    if (query.limit && parsedLimit === undefined) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Limite invalido",
      });
    }

    let reports = await listReports();

    if (request.user.role !== "admin") {
      reports = reports.filter((report) => report.authorId === request.user!.id);
    } else if (query.author_id) {
      reports = reports.filter((report) => report.authorId === query.author_id);
    }

    if (periodStart) {
      reports = reports.filter(
        (report) => report.eventDate >= periodStart
      );
    }
    if (periodEnd) {
      reports = reports.filter((report) => report.eventDate <= periodEnd);
    }

    const search = query.search?.trim().toLowerCase();
    if (search) {
      reports = reports.filter((report) => {
        return (
          report.contractorName.toLowerCase().includes(search) ||
          report.location.toLowerCase().includes(search) ||
          report.teamSummary.toLowerCase().includes(search) ||
          (report.notes?.toLowerCase().includes(search) ?? false)
        );
      });
    }

    reports.sort((a, b) => {
      if (a.eventDate.getTime() !== b.eventDate.getTime()) {
        return b.eventDate.getTime() - a.eventDate.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const start = (page - 1) * limit;
    const paged = reports.slice(start, start + limit);

    return reply.status(200).send({
      data: paged.map((report) => ({
        id: report.id,
        event_date: formatDate(report.eventDate),
        contractor_name: report.contractorName,
        author_id: report.authorId,
      })),
    });
  });

  app.post("/api/v1/relatorios", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const {
      event_date,
      contractor_name,
      location,
      team_summary,
      quality_sound,
      quality_microphone,
      notes,
      feedbacks,
    } = request.body as ReportBody;

    if (!event_date || !contractor_name || !location || !team_summary) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Campos obrigatorios ausentes",
      });
    }

    const eventDate = parseDate(event_date);
    if (!eventDate) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Data do evento invalida",
      });
    }

    if (
      (quality_sound !== undefined && !isValidRating(quality_sound)) ||
      (quality_microphone !== undefined &&
        !isValidRating(quality_microphone))
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Qualidade informada invalida",
      });
    }

    if (feedbacks && !Array.isArray(feedbacks)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Feedbacks invalidos",
      });
    }

    const parsedFeedbacks =
      feedbacks?.map((entry) => ({
        memberId: entry.member_id ?? "",
        feedback: entry.feedback ?? "",
      })) ?? [];

    if (
      parsedFeedbacks.some(
        (entry) => !entry.memberId || !entry.feedback
      )
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Feedbacks invalidos",
      });
    }

    const report = await createReport(request.user.id, {
      eventDate,
      contractorName: contractor_name,
      location,
      teamSummary: team_summary,
      qualitySound: quality_sound,
      qualityMicrophone: quality_microphone,
      notes,
      feedbacks: parsedFeedbacks,
    });

    return reply.status(201).send({
      data: {
        id: report.id,
      },
    });
  });

  app.get("/api/v1/relatorios/:id", async (request, reply) => {
    const reportId = request.params as { id?: string };
    if (!reportId.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Relatorio invalido",
      });
    }

    const report = await getReportById(reportId.id);
    if (!report) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    if (request.user.role !== "admin" && request.user.id !== report.authorId) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    return reply.status(200).send({
      data: {
        id: report.id,
        event_date: formatDate(report.eventDate),
        contractor_name: report.contractorName,
        location: report.location,
        team_summary: report.teamSummary,
        quality_sound: report.qualitySound,
        quality_microphone: report.qualityMicrophone,
        notes: report.notes,
        author_id: report.authorId,
        media: report.media.map((media) => ({
          id: media.id,
          url: media.url,
          media_type: media.type,
          size_bytes: media.sizeBytes,
        })),
        feedbacks: report.feedbacks.map((feedback) => ({
          member_id: feedback.memberId,
          feedback: feedback.feedback,
        })),
      },
    });
  });

  app.get("/api/v1/relatorios/:id/pdf", async (request, reply) => {
    const reportId = request.params as { id?: string };
    if (!reportId.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Relatorio invalido",
      });
    }

    const report = await getReportById(reportId.id);
    if (!report) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    if (request.user.role !== "admin" && request.user.id !== report.authorId) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const lines = [
      `Relatorio ${report.id}`,
      `Data: ${formatDate(report.eventDate)}`,
      `Contratante: ${report.contractorName}`,
      `Local: ${report.location}`,
      `Resumo: ${report.teamSummary}`,
      `Qualidade som: ${report.qualitySound ?? "N/A"}`,
      `Qualidade microfone: ${report.qualityMicrophone ?? "N/A"}`,
      `Observacoes: ${report.notes ?? "-"}`,
      `Midias: ${report.media.length}`,
      `Feedbacks: ${report.feedbacks.length}`,
    ];

    const pdf = buildPdfDocument(lines);

    return reply
      .type("application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="relatorio-${report.id}.pdf"`
      )
      .send(pdf);
  });

  app.post("/api/v1/relatorios/:id/media", async (request, reply) => {
    const reportId = request.params as { id?: string };
    if (!reportId.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Relatorio invalido",
      });
    }

    const report = await getReportById(reportId.id);
    if (!report) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    if (request.user.role !== "admin" && request.user.id !== report.authorId) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    if (!request.isMultipart()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Envie o arquivo usando multipart/form-data",
      });
    }

    const fileData = await request.file();
    if (!fileData) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Arquivo ausente",
      });
    }

    const mediaTypeValue =
      typeof fileData.fields?.media_type?.value === "string"
        ? fileData.fields.media_type.value
        : undefined;
    const mediaType = parseMediaType(mediaTypeValue, fileData.mimetype);
    if (!mediaType) {
      return reply.status(400).send({
        error: "invalid_media_type",
        message: "Tipo de midia invalido",
      });
    }

    const extension = resolveExtension(
      fileData.filename ?? "",
      mediaType,
      fileData.mimetype
    );
    if (!extension) {
      return reply.status(400).send({
        error: "invalid_media_url",
        message: "Extensao de arquivo invalida",
      });
    }

    const maxSize = maxSizeForType(mediaType);
    const filename = `${randomUUID()}${extension}`;
    const relativePath = join("relatorios", report.id, filename);
    const storagePath = join(uploadsRoot, relativePath);

    const fileStream = fileData.file as NodeJS.ReadableStream & {
      truncated?: boolean;
    };
    let sizeBytes = 0;
    try {
      sizeBytes = await saveUploadToDisk({
        stream: fileStream,
        targetPath: storagePath,
        maxSize,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "file_too_large") {
        return reply.status(400).send({
          error: "file_too_large",
          message: "Arquivo excede o tamanho permitido",
        });
      }
      throw error;
    }

    if (fileStream.truncated) {
      await safeUnlink(storagePath);
      return reply.status(400).send({
        error: "file_too_large",
        message: "Arquivo excede o tamanho permitido",
      });
    }

    const publicPath = relativePath.split(sep).join("/");
    const url = `/uploads/${publicPath}`;

    const media = await addMediaToReport(report.id, {
      type: mediaType,
      url,
      sizeBytes,
    });

    if (!media) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    return reply.status(201).send({
      data: {
        id: media.id,
        url: media.url,
        media_type: media.type,
        size_bytes: media.sizeBytes,
      },
    });
  });
}
