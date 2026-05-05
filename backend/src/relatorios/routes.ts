import type { Multipart } from "@fastify/multipart";
import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { deleteFromR2, getPresignedDownloadUrl, getPresignedViewUrl, uploadToR2 } from "../lib/r2.js";
import {
  addMediaToReport,
  createReport,
  deleteReport,
  getReportById,
  getReportsStats,
  listReports,
  MediaType,
  updateReport,
} from "./store.js";
import type { ReportsStatsResponse } from "./dto/reports-stats.dto.js";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

const mediaExtensions: Record<MediaType, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".mov", ".webm"],
};

const mediaMimeExtensions: Record<MediaType, Record<string, string>> = {
  image: {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
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
  title_schedule?: string;
  birthday_age?: string;
  transport_type: string;
  uber_go_value?: number;
  uber_return_value?: number;
  other_car_responsible?: string;
  has_extra_hours?: boolean;
  extra_hours_details?: string;
  outside_brasilia?: boolean;
  exclusive_event?: boolean;
  team_summary?: string;
  team_general_description?: string;
  team_general_score?: number;
  event_difficulties?: string;
  event_difficulty_score?: number;
  event_quality_score?: number;
  quality_sound?: number;
  quality_microphone?: number;
  speaker_number?: number;
  electronics_notes?: string;
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

function getMultipartFieldValue(
  field?: Multipart | Multipart[]
): string | undefined {
  const candidate = Array.isArray(field) ? field[0] : field;
  if (!candidate) {
    return undefined;
  }
  if ("value" in candidate && typeof candidate.value === "string") {
    return candidate.value;
  }
  return undefined;
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

function normalizeExtraHours(input: {
  hasExtraHours?: boolean;
  extraHoursDetails?: number;
}): { hasExtraHours?: boolean; extraHoursDetails?: number } {
  const details = input.extraHoursDetails;
  if (input.hasExtraHours === false) {
    return { hasExtraHours: false, extraHoursDetails: undefined };
  }
  if (input.hasExtraHours === true) {
    return { hasExtraHours: true, extraHoursDetails: details };
  }
  if (details !== undefined) {
    return { hasExtraHours: true, extraHoursDetails: details };
  }
  return { hasExtraHours: undefined, extraHoursDetails: undefined };
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
  return Number.isInteger(value) && value >= 0 && value <= 5;
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

function isValidOptionalMoney(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

const FIELD_LIMITS: Array<{ field: keyof ReportBody; label: string; max: number }> = [
  { field: "contractor_name", label: "Aniversariante/Contratante", max: 250 },
  { field: "title_schedule", label: "Título / Cronograma", max: 300 },
  { field: "other_car_responsible", label: "Responsável pelo carro", max: 150 },
];

function validateFieldLengths(body: ReportBody): string | null {
  for (const { field, label, max } of FIELD_LIMITS) {
    const value = body[field];
    if (typeof value === "string" && value.length > max) {
      return `O campo "${label}" excede o limite de ${max} caracteres (atual: ${value.length}).`;
    }
  }
  return null;
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
          report.authorName.toLowerCase().includes(search) ||
          report.contractorName.toLowerCase().includes(search) ||
          report.titleSchedule.toLowerCase().includes(search) ||
          report.teamSummary.toLowerCase().includes(search) ||
          (report.teamGeneralDescription?.toLowerCase().includes(search) ?? false) ||
          (report.eventDifficulties?.toLowerCase().includes(search) ?? false) ||
          (report.electronicsNotes?.toLowerCase().includes(search) ?? false) ||
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
      data: await Promise.all(paged.map(async (report) => ({
        id: report.id,
        event_date: formatDate(report.eventDate),
        contractor_name: report.contractorName,
        title_schedule: report.titleSchedule,
        author_id: report.authorId,
        author_name: report.authorName,
        media: await Promise.all(report.media.map(async (media) => ({
          id: media.id,
          url: await getPresignedViewUrl(media.url),
          media_type: media.type,
          topic: media.topic,
          size_bytes: media.sizeBytes,
        }))),
      }))),
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
      title_schedule,
      birthday_age,
      transport_type,
      uber_go_value,
      uber_return_value,
      other_car_responsible,
      has_extra_hours,
      extra_hours_details,
      outside_brasilia,
      exclusive_event,
      team_summary,
      team_general_description,
      team_general_score,
      event_difficulties,
      event_difficulty_score,
      event_quality_score,
      quality_sound,
      quality_microphone,
      speaker_number,
      electronics_notes,
      notes,
      feedbacks,
    } = request.body as ReportBody;

    if (!event_date || !contractor_name || !team_summary || !title_schedule || !transport_type) {
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
      (team_general_score !== undefined && !isValidRating(team_general_score)) ||
      (event_difficulty_score !== undefined &&
        !isValidRating(event_difficulty_score)) ||
      (event_quality_score !== undefined &&
        !isValidRating(event_quality_score)) ||
      (quality_sound !== undefined && !isValidRating(quality_sound)) ||
      (quality_microphone !== undefined &&
        !isValidRating(quality_microphone))
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Nota informada invalida",
      });
    }

    if (
      !isValidOptionalMoney(uber_go_value) ||
      !isValidOptionalMoney(uber_return_value)
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Valor de locomoção invalido",
      });
    }

    if (
      speaker_number !== undefined &&
      (!Number.isInteger(speaker_number) || speaker_number < 0)
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Numero da caixa invalido",
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

    const fieldLengthError = validateFieldLengths(request.body as ReportBody);
    if (fieldLengthError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: fieldLengthError,
      });
    }

    const normalizedExtraHours = normalizeExtraHours({
      hasExtraHours: has_extra_hours,
      extraHoursDetails: extra_hours_details != null ? Number(extra_hours_details) : undefined,
    });

    const report = await createReport(request.user.id, {
      eventDate,
      contractorName: contractor_name,
      titleSchedule: title_schedule,
      birthdayAge: birthday_age != null ? Number(birthday_age) : undefined,
      transportType: transport_type,
      uberGoValue: uber_go_value,
      uberReturnValue: uber_return_value,
      otherCarResponsible: other_car_responsible,
      hasExtraHours: normalizedExtraHours.hasExtraHours,
      extraHoursDetails: normalizedExtraHours.extraHoursDetails,
      outsideBrasilia: outside_brasilia ?? false,
      exclusiveEvent: exclusive_event ?? false,
      teamSummary: team_summary,
      teamGeneralDescription: team_general_description,
      teamGeneralScore: team_general_score,
      eventDifficulties: event_difficulties,
      eventDifficultyScore: event_difficulty_score,
      eventQualityScore: event_quality_score,
      qualitySound: quality_sound,
      qualityMicrophone: quality_microphone,
      speakerNumber: speaker_number,
      electronicsNotes: electronics_notes,
      notes,
      feedbacks: parsedFeedbacks,
    });

    return reply.status(201).send({
      data: {
        id: report.id,
      },
    });
  });

  app.get("/api/v1/relatorios/stats", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as { month?: string; year?: string };
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    if (!month || !year || month < 1 || month > 12 || year < 2020) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Mes ou ano invalido",
      });
    }

    const stats = await getReportsStats(month, year);

    return reply.status(200).send({
      data: stats,
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
        title_schedule: report.titleSchedule,
        birthday_age: report.birthdayAge,
        transport_type: report.transportType,
        uber_go_value: report.uberGoValue,
        uber_return_value: report.uberReturnValue,
        other_car_responsible: report.otherCarResponsible,
        has_extra_hours: report.hasExtraHours,
        extra_hours_details: report.extraHoursDetails,
        outside_brasilia: report.outsideBrasilia,
        exclusive_event: report.exclusiveEvent,
        team_summary: report.teamSummary,
        team_general_description: report.teamGeneralDescription,
        team_general_score: report.teamGeneralScore,
        event_difficulties: report.eventDifficulties,
        event_difficulty_score: report.eventDifficultyScore,
        event_quality_score: report.eventQualityScore,
        quality_sound: report.qualitySound,
        quality_microphone: report.qualityMicrophone,
        speaker_number: report.speakerNumber,
        electronics_notes: report.electronicsNotes,
        notes: report.notes,
        author_id: report.authorId,
        author_name: report.authorName,
        created_at: report.createdAt.toISOString(),
        media: await Promise.all(report.media.map(async (media) => ({
          id: media.id,
          url: await getPresignedViewUrl(media.url),
          media_type: media.type,
          topic: media.topic,
          size_bytes: media.sizeBytes,
        }))),
        feedbacks: report.feedbacks.map((feedback) => ({
          member_id: feedback.memberId,
          member_name: feedback.memberName,
          feedback: feedback.feedback,
        })),
      },
    });
  });

  app.patch("/api/v1/relatorios/:id", async (request, reply) => {
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

    const {
      event_date,
      contractor_name,
      title_schedule,
      birthday_age,
      transport_type,
      uber_go_value,
      uber_return_value,
      other_car_responsible,
      has_extra_hours,
      extra_hours_details,
      outside_brasilia,
      exclusive_event,
      team_summary,
      team_general_description,
      team_general_score,
      event_difficulties,
      event_difficulty_score,
      event_quality_score,
      quality_sound,
      quality_microphone,
      speaker_number,
      electronics_notes,
      notes,
      feedbacks,
    } = request.body as ReportBody;

    if (!event_date || !contractor_name || !team_summary || !title_schedule || !transport_type) {
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
      (team_general_score !== undefined && !isValidRating(team_general_score)) ||
      (event_difficulty_score !== undefined &&
        !isValidRating(event_difficulty_score)) ||
      (event_quality_score !== undefined &&
        !isValidRating(event_quality_score)) ||
      (quality_sound !== undefined && !isValidRating(quality_sound)) ||
      (quality_microphone !== undefined &&
        !isValidRating(quality_microphone))
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Nota informada invalida",
      });
    }

    if (
      !isValidOptionalMoney(uber_go_value) ||
      !isValidOptionalMoney(uber_return_value)
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Valor de locomoção invalido",
      });
    }

    if (
      speaker_number !== undefined &&
      (!Number.isInteger(speaker_number) || speaker_number < 0)
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Numero da caixa invalido",
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

    if (parsedFeedbacks.some((entry) => !entry.memberId || !entry.feedback)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Feedbacks invalidos",
      });
    }

    const fieldLengthError = validateFieldLengths(request.body as ReportBody);
    if (fieldLengthError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: fieldLengthError,
      });
    }

    const normalizedExtraHours = normalizeExtraHours({
      hasExtraHours: has_extra_hours,
      extraHoursDetails: extra_hours_details != null ? Number(extra_hours_details) : undefined,
    });

    const updated = await updateReport(report.id, {
      eventDate,
      contractorName: contractor_name,
      titleSchedule: title_schedule,
      birthdayAge: birthday_age != null ? Number(birthday_age) : undefined,
      transportType: transport_type,
      uberGoValue: uber_go_value,
      uberReturnValue: uber_return_value,
      otherCarResponsible: other_car_responsible,
      hasExtraHours: normalizedExtraHours.hasExtraHours,
      extraHoursDetails: normalizedExtraHours.extraHoursDetails,
      outsideBrasilia: outside_brasilia ?? false,
      exclusiveEvent: exclusive_event ?? false,
      teamSummary: team_summary,
      teamGeneralDescription: team_general_description,
      teamGeneralScore: team_general_score,
      eventDifficulties: event_difficulties,
      eventDifficultyScore: event_difficulty_score,
      eventQualityScore: event_quality_score,
      qualitySound: quality_sound,
      qualityMicrophone: quality_microphone,
      speakerNumber: speaker_number,
      electronicsNotes: electronics_notes,
      notes,
      feedbacks: parsedFeedbacks,
    });

    if (!updated) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    return reply.status(200).send({
      data: {
        id: updated.id,
      },
    });
  });

  app.delete("/api/v1/relatorios/:id", async (request, reply) => {
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

    const removed = await deleteReport(report.id);
    if (!removed) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    await Promise.all(report.media.map((media) => deleteFromR2(media.url)));

    return reply.status(204).send();
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
      `Titulo/Cronograma: ${report.titleSchedule}`,
      `Locomocao: ${report.transportType ?? "-"}`,
      `Resumo: ${report.teamSummary}`,
      `Descricao da equipe: ${report.teamGeneralDescription ?? "-"}`,
      `Nota geral da equipe: ${report.teamGeneralScore ?? "N/A"}`,
      `Dificuldades do evento: ${report.eventDifficulties ?? "-"}`,
      `Nota de dificuldade: ${report.eventDifficultyScore ?? "N/A"}`,
      `Nota de qualidade do evento: ${report.eventQualityScore ?? "N/A"}`,
      `Qualidade som: ${report.qualitySound ?? "N/A"}`,
      `Qualidade microfone: ${report.qualityMicrophone ?? "N/A"}`,
      `Numero da caixa: ${report.speakerNumber ?? "-"}`,
      `Observacoes eletronicos: ${report.electronicsNotes ?? "-"}`,
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

  app.get("/api/v1/relatorios/:id/media/:mediaId/download", async (request, reply) => {
    const { id, mediaId } = request.params as { id?: string; mediaId?: string };
    if (!id || !mediaId) {
      return reply.status(400).send({ error: "invalid_request", message: "Parametros invalidos" });
    }

    const report = await getReportById(id);
    if (!report) {
      return reply.status(404).send({ error: "not_found", message: "Relatorio nao encontrado" });
    }

    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    if (request.user.role !== "admin" && request.user.id !== report.authorId) {
      return reply.status(403).send({ error: "forbidden", message: "Acesso negado" });
    }

    const media = report.media.find((m) => m.id === mediaId);
    if (!media) {
      return reply.status(404).send({ error: "not_found", message: "Midia nao encontrada" });
    }

    const filename = media.url.split("/").pop() ?? mediaId;
    const presignedUrl = await getPresignedDownloadUrl(media.url, filename);

    return reply.status(200).send({ url: presignedUrl });
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

    const mediaTypeValue = getMultipartFieldValue(
      fileData.fields?.media_type
    );
    const mediaType = parseMediaType(mediaTypeValue, fileData.mimetype);
    if (!mediaType) {
      return reply.status(400).send({
        error: "invalid_media_type",
        message: "Tipo de midia invalido",
      });
    }

    const topic = getMultipartFieldValue(fileData.fields?.topic);

    // Log available fields for debugging
    const fieldKeys = fileData.fields ? Object.keys(fileData.fields) : [];
    console.log(`[MEDIA_UPLOAD] file: ${fileData.filename}, fields: ${fieldKeys.join(', ')}, topic: ${topic}`);

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
    const key = `relatorios/${report.id}/${filename}`;

    const fileStream = fileData.file as NodeJS.ReadableStream;
    let uploadedKey: string;
    let sizeBytes: number;
    try {
      ({ key: uploadedKey, sizeBytes } = await uploadToR2({
        stream: fileStream,
        key,
        contentType: fileData.mimetype ?? "application/octet-stream",
        maxSize,
      }));
    } catch (error) {
      if (error instanceof Error && error.message === "file_too_large") {
        return reply.status(400).send({
          error: "file_too_large",
          message: "Arquivo excede o tamanho permitido",
        });
      }
      throw error;
    }

    const media = await addMediaToReport(report.id, {
      type: mediaType,
      topic,
      url: uploadedKey,
      sizeBytes,
    });

    if (!media) {
      return reply.status(404).send({
        error: "not_found",
        message: "Relatorio nao encontrado",
      });
    }

    const viewUrl = await getPresignedViewUrl(uploadedKey);

    return reply.status(201).send({
      data: {
        id: media.id,
        url: viewUrl,
        media_type: media.type,
        topic: media.topic,
        size_bytes: media.sizeBytes,
      },
    });
  });
}
