import { FastifyInstance } from "fastify";
import { extname } from "node:path";
import {
  addMediaToReport,
  createReport,
  getReportById,
  listReports,
  MediaType,
} from "./store.js";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

const mediaExtensions: Record<MediaType, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".mov", ".webm"],
};

interface MediaBody {
  media_type?: MediaType;
  url?: string;
  size_bytes?: number;
}

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

function isAllowedExtension(url: string, type: MediaType): boolean {
  const extension = extname(url.split("?")[0]).toLowerCase();
  if (!extension) {
    return false;
  }
  return mediaExtensions[type].includes(extension);
}

function maxSizeForType(type: MediaType): number {
  return type === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
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

    const { media_type, url, size_bytes } = request.body as MediaBody;

    if (!media_type || !url || size_bytes === undefined) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Tipo, url e tamanho sao obrigatorios",
      });
    }

    if (media_type !== "image" && media_type !== "video") {
      return reply.status(400).send({
        error: "invalid_media_type",
        message: "Tipo de midia invalido",
      });
    }

    if (!Number.isFinite(size_bytes) || size_bytes <= 0) {
      return reply.status(400).send({
        error: "invalid_file_size",
        message: "Tamanho do arquivo invalido",
      });
    }

    if (!isAllowedExtension(url, media_type)) {
      return reply.status(400).send({
        error: "invalid_media_url",
        message: "Extensao de arquivo invalida",
      });
    }

    const maxSize = maxSizeForType(media_type);
    if (size_bytes > maxSize) {
      return reply.status(400).send({
        error: "file_too_large",
        message: "Arquivo excede o tamanho permitido",
      });
    }

    const media = await addMediaToReport(report.id, {
      type: media_type,
      url,
      sizeBytes: size_bytes,
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
