import { prisma } from "../db/prisma.js";

export type MediaType = "image" | "video";

export interface MediaRecord {
  id: string;
  reportId: string;
  type: MediaType;
  url: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface FeedbackRecord {
  id: string;
  reportId: string;
  memberId: string;
  feedback: string;
  createdAt: Date;
}

export interface ReportRecord {
  id: string;
  authorId: string;
  eventDate: Date;
  contractorName: string;
  location: string;
  teamSummary: string;
  qualitySound?: number;
  qualityMicrophone?: number;
  notes?: string;
  createdAt: Date;
  media: MediaRecord[];
  feedbacks: FeedbackRecord[];
}

export interface CreateReportInput {
  eventDate: Date;
  contractorName: string;
  location: string;
  teamSummary: string;
  qualitySound?: number;
  qualityMicrophone?: number;
  notes?: string;
  feedbacks?: Array<{
    memberId: string;
    feedback: string;
  }>;
}

function toMediaRecord(entry: {
  id: string;
  reportId: string;
  mediaType: MediaType;
  url: string;
  sizeBytes: number;
  createdAt: Date;
}): MediaRecord {
  return {
    id: entry.id,
    reportId: entry.reportId,
    type: entry.mediaType,
    url: entry.url,
    sizeBytes: entry.sizeBytes,
    createdAt: entry.createdAt,
  };
}

function toFeedbackRecord(entry: {
  id: string;
  reportId: string;
  memberId: string;
  feedback: string;
  createdAt: Date;
}): FeedbackRecord {
  return {
    id: entry.id,
    reportId: entry.reportId,
    memberId: entry.memberId,
    feedback: entry.feedback,
    createdAt: entry.createdAt,
  };
}

function toReportRecord(report: {
  id: string;
  authorId: string;
  eventDate: Date;
  contractorName: string;
  location: string;
  teamSummary: string | null;
  qualitySound: number | null;
  qualityMicrophone: number | null;
  notes: string | null;
  createdAt: Date;
  media: Array<{
    id: string;
    reportId: string;
    mediaType: MediaType;
    url: string;
    sizeBytes: number;
    createdAt: Date;
  }>;
  feedbacks: Array<{
    id: string;
    reportId: string;
    memberId: string;
    feedback: string;
    createdAt: Date;
  }>;
}): ReportRecord {
  return {
    id: report.id,
    authorId: report.authorId,
    eventDate: report.eventDate,
    contractorName: report.contractorName,
    location: report.location,
    teamSummary: report.teamSummary ?? "Nao informado",
    qualitySound: report.qualitySound ?? undefined,
    qualityMicrophone: report.qualityMicrophone ?? undefined,
    notes: report.notes ?? undefined,
    createdAt: report.createdAt,
    media: report.media.map((media) => toMediaRecord(media)),
    feedbacks: report.feedbacks.map((feedback) => toFeedbackRecord(feedback)),
  };
}

export async function createReport(
  authorId: string,
  input?: Partial<CreateReportInput>
): Promise<ReportRecord> {
  const report = await prisma.report.create({
    data: {
      authorId,
      eventDate: input?.eventDate ?? new Date(),
      contractorName: input?.contractorName ?? "Nao informado",
      location: input?.location ?? "Nao informado",
      teamSummary: input?.teamSummary ?? "Nao informado",
      qualitySound: input?.qualitySound,
      qualityMicrophone: input?.qualityMicrophone,
      notes: input?.notes,
      feedbacks: input?.feedbacks?.length
        ? {
            create: input.feedbacks.map((feedback) => ({
              memberId: feedback.memberId,
              feedback: feedback.feedback,
            })),
          }
        : undefined,
    },
    include: { media: true, feedbacks: true },
  });

  return toReportRecord(report);
}

export async function getReportById(
  id: string
): Promise<ReportRecord | undefined> {
  const report = await prisma.report.findUnique({
    where: { id },
    include: { media: true, feedbacks: true },
  });
  return report ? toReportRecord(report) : undefined;
}

export async function listReports(): Promise<ReportRecord[]> {
  const reports = await prisma.report.findMany({
    include: { media: true, feedbacks: true },
  });
  return reports.map((report) => toReportRecord(report));
}

export async function addMediaToReport(
  reportId: string,
  input: Omit<MediaRecord, "id" | "reportId" | "createdAt">
): Promise<MediaRecord | undefined> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return undefined;
  }

  const media = await prisma.reportMedia.create({
    data: {
      reportId,
      mediaType: input.type,
      url: input.url,
      sizeBytes: input.sizeBytes,
    },
  });

  return toMediaRecord(media);
}

export async function resetReports(): Promise<void> {
  await prisma.reportFeedback.deleteMany();
  await prisma.reportMedia.deleteMany();
  await prisma.report.deleteMany();
}
