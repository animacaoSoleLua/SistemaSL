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
  memberName: string;
  feedback: string;
  createdAt: Date;
}

export interface MemberFeedbackRecord {
  id: string;
  reportId: string;
  memberId: string;
  feedback: string;
  eventDate: Date;
  contractorName: string;
  createdAt: Date;
}

export interface ReportRecord {
  id: string;
  authorId: string;
  authorName: string;
  eventDate: Date;
  contractorName: string;
  location: string;
  titleSchedule?: string;
  transportType?: string;
  uberGoValue?: number;
  uberReturnValue?: number;
  otherCarResponsible?: string;
  hasExtraHours?: boolean;
  extraHoursDetails?: string;
  outsideBrasilia: boolean;
  exclusiveEvent: boolean;
  teamSummary: string;
  teamGeneralDescription?: string;
  teamGeneralScore?: number;
  eventDifficulties?: string;
  eventDifficultyScore?: number;
  eventQualityScore?: number;
  qualitySound?: number;
  qualityMicrophone?: number;
  speakerNumber?: number;
  electronicsNotes?: string;
  notes?: string;
  createdAt: Date;
  media: MediaRecord[];
  feedbacks: FeedbackRecord[];
}

export interface CreateReportInput {
  eventDate: Date;
  contractorName: string;
  location: string;
  titleSchedule?: string;
  transportType?: string;
  uberGoValue?: number;
  uberReturnValue?: number;
  otherCarResponsible?: string;
  hasExtraHours?: boolean;
  extraHoursDetails?: string;
  outsideBrasilia?: boolean;
  exclusiveEvent?: boolean;
  teamSummary: string;
  teamGeneralDescription?: string;
  teamGeneralScore?: number;
  eventDifficulties?: string;
  eventDifficultyScore?: number;
  eventQualityScore?: number;
  qualitySound?: number;
  qualityMicrophone?: number;
  speakerNumber?: number;
  electronicsNotes?: string;
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
  member?: {
    name: string;
    lastName: string | null;
  } | null;
  feedback: string;
  createdAt: Date;
}): FeedbackRecord {
  const memberName = entry.member
    ? `${entry.member.name} ${entry.member.lastName ?? ""}`.trim()
    : "Membro desconhecido";

  return {
    id: entry.id,
    reportId: entry.reportId,
    memberId: entry.memberId,
    memberName,
    feedback: entry.feedback,
    createdAt: entry.createdAt,
  };
}

function toReportRecord(report: {
  id: string;
  authorId: string;
  author?: {
    name: string;
    lastName: string | null;
  } | null;
  eventDate: Date;
  contractorName: string;
  location: string;
  titleSchedule?: string | null;
  transportType?: string | null;
  uberGoValue?: number | null;
  uberReturnValue?: number | null;
  otherCarResponsible?: string | null;
  hasExtraHours?: boolean | null;
  extraHoursDetails?: string | null;
  outsideBrasilia?: boolean;
  exclusiveEvent?: boolean;
  teamSummary: string | null;
  teamGeneralDescription?: string | null;
  teamGeneralScore?: number | null;
  eventDifficulties?: string | null;
  eventDifficultyScore?: number | null;
  eventQualityScore?: number | null;
  qualitySound: number | null;
  qualityMicrophone: number | null;
  speakerNumber?: number | null;
  electronicsNotes?: string | null;
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
    member?: {
      name: string;
      lastName: string | null;
    } | null;
    feedback: string;
    createdAt: Date;
  }>;
}): ReportRecord {
  const authorName = report.author
    ? `${report.author.name} ${report.author.lastName ?? ""}`.trim()
    : "Autor desconhecido";

  return {
    id: report.id,
    authorId: report.authorId,
    authorName,
    eventDate: report.eventDate,
    contractorName: report.contractorName,
    location: report.location,
    titleSchedule: report.titleSchedule ?? undefined,
    transportType: report.transportType ?? undefined,
    uberGoValue: report.uberGoValue ?? undefined,
    uberReturnValue: report.uberReturnValue ?? undefined,
    otherCarResponsible: report.otherCarResponsible ?? undefined,
    hasExtraHours: report.hasExtraHours ?? undefined,
    extraHoursDetails: report.extraHoursDetails ?? undefined,
    outsideBrasilia: report.outsideBrasilia ?? false,
    exclusiveEvent: report.exclusiveEvent ?? false,
    teamSummary: report.teamSummary ?? "Nao informado",
    teamGeneralDescription: report.teamGeneralDescription ?? undefined,
    teamGeneralScore: report.teamGeneralScore ?? undefined,
    eventDifficulties: report.eventDifficulties ?? undefined,
    eventDifficultyScore: report.eventDifficultyScore ?? undefined,
    eventQualityScore: report.eventQualityScore ?? undefined,
    qualitySound: report.qualitySound ?? undefined,
    qualityMicrophone: report.qualityMicrophone ?? undefined,
    speakerNumber: report.speakerNumber ?? undefined,
    electronicsNotes: report.electronicsNotes ?? undefined,
    notes: report.notes ?? undefined,
    createdAt: report.createdAt,
    media: report.media.map((media) => toMediaRecord(media)),
    feedbacks: report.feedbacks.map((feedback) => toFeedbackRecord(feedback)),
  };
}

type ReportExtraFields = Partial<
  Pick<
    CreateReportInput,
    | "titleSchedule"
    | "transportType"
    | "uberGoValue"
    | "uberReturnValue"
    | "otherCarResponsible"
    | "hasExtraHours"
    | "extraHoursDetails"
    | "outsideBrasilia"
    | "exclusiveEvent"
    | "teamGeneralDescription"
    | "teamGeneralScore"
    | "eventDifficulties"
    | "eventDifficultyScore"
    | "eventQualityScore"
    | "speakerNumber"
    | "electronicsNotes"
  >
>;

async function updateReportExtraFields(
  reportId: string,
  fields: ReportExtraFields
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "reports"
    SET
      "title_schedule" = ${fields.titleSchedule ?? null},
      "transport_type" = ${fields.transportType ?? null},
      "uber_go_value" = ${fields.uberGoValue ?? null},
      "uber_return_value" = ${fields.uberReturnValue ?? null},
      "other_car_responsible" = ${fields.otherCarResponsible ?? null},
      "has_extra_hours" = ${fields.hasExtraHours ?? null},
      "extra_hours_details" = ${fields.extraHoursDetails ?? null},
      "outside_brasilia" = ${fields.outsideBrasilia ?? false},
      "exclusive_event" = ${fields.exclusiveEvent ?? false},
      "team_general_description" = ${fields.teamGeneralDescription ?? null},
      "team_general_score" = ${fields.teamGeneralScore ?? null},
      "event_difficulties" = ${fields.eventDifficulties ?? null},
      "event_difficulty_score" = ${fields.eventDifficultyScore ?? null},
      "event_quality_score" = ${fields.eventQualityScore ?? null},
      "speaker_number" = ${fields.speakerNumber ?? null},
      "electronics_notes" = ${fields.electronicsNotes ?? null}
    WHERE "id" = ${reportId}::uuid
  `;
}

async function getReportExtraFields(
  reportId: string
): Promise<{
  titleSchedule?: string | null;
  transportType?: string | null;
  uberGoValue?: number | null;
  uberReturnValue?: number | null;
  otherCarResponsible?: string | null;
  hasExtraHours?: boolean | null;
  extraHoursDetails?: string | null;
  outsideBrasilia?: boolean;
  exclusiveEvent?: boolean;
  teamGeneralDescription?: string | null;
  teamGeneralScore?: number | null;
  eventDifficulties?: string | null;
  eventDifficultyScore?: number | null;
  eventQualityScore?: number | null;
  speakerNumber?: number | null;
  electronicsNotes?: string | null;
}> {
  const rows = await prisma.$queryRaw<
    Array<{
      title_schedule: string | null;
      transport_type: string | null;
      uber_go_value: number | null;
      uber_return_value: number | null;
      other_car_responsible: string | null;
      has_extra_hours: boolean | null;
      extra_hours_details: string | null;
      outside_brasilia: boolean;
      exclusive_event: boolean;
      team_general_description: string | null;
      team_general_score: number | null;
      event_difficulties: string | null;
      event_difficulty_score: number | null;
      event_quality_score: number | null;
      speaker_number: number | null;
      electronics_notes: string | null;
    }>
  >`
    SELECT
      "title_schedule",
      "transport_type",
      "uber_go_value",
      "uber_return_value",
      "other_car_responsible",
      "has_extra_hours",
      "extra_hours_details",
      "outside_brasilia",
      "exclusive_event",
      "team_general_description",
      "team_general_score",
      "event_difficulties",
      "event_difficulty_score",
      "event_quality_score",
      "speaker_number",
      "electronics_notes"
    FROM "reports"
    WHERE "id" = ${reportId}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return {};
  }

  return {
    titleSchedule: row.title_schedule,
    transportType: row.transport_type,
    uberGoValue: row.uber_go_value,
    uberReturnValue: row.uber_return_value,
    otherCarResponsible: row.other_car_responsible,
    hasExtraHours: row.has_extra_hours,
    extraHoursDetails: row.extra_hours_details,
    outsideBrasilia: row.outside_brasilia,
    exclusiveEvent: row.exclusive_event,
    teamGeneralDescription: row.team_general_description,
    teamGeneralScore: row.team_general_score,
    eventDifficulties: row.event_difficulties,
    eventDifficultyScore: row.event_difficulty_score,
    eventQualityScore: row.event_quality_score,
    speakerNumber: row.speaker_number,
    electronicsNotes: row.electronics_notes,
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
    include: {
      media: true,
      feedbacks: {
        include: {
          member: { select: { name: true, lastName: true } },
        },
      },
      author: { select: { name: true, lastName: true } },
    },
  });

  await updateReportExtraFields(report.id, {
    titleSchedule: input?.titleSchedule,
    transportType: input?.transportType,
    uberGoValue: input?.uberGoValue,
    uberReturnValue: input?.uberReturnValue,
    otherCarResponsible: input?.otherCarResponsible,
    hasExtraHours: input?.hasExtraHours,
    extraHoursDetails: input?.extraHoursDetails,
    outsideBrasilia: input?.outsideBrasilia ?? false,
    exclusiveEvent: input?.exclusiveEvent ?? false,
    teamGeneralDescription: input?.teamGeneralDescription,
    teamGeneralScore: input?.teamGeneralScore,
    eventDifficulties: input?.eventDifficulties,
    eventDifficultyScore: input?.eventDifficultyScore,
    eventQualityScore: input?.eventQualityScore,
    speakerNumber: input?.speakerNumber,
    electronicsNotes: input?.electronicsNotes,
  });

  const extra = await getReportExtraFields(report.id);
  return toReportRecord({ ...report, ...extra });
}

export async function updateReport(
  id: string,
  input: Partial<CreateReportInput>
): Promise<ReportRecord | undefined> {
  const existing = await prisma.report.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return undefined;
  }

  await prisma.report.update({
    where: { id },
    data: {
      eventDate: input.eventDate ?? new Date(),
      contractorName: input.contractorName ?? "Nao informado",
      location: input.location ?? "Nao informado",
      teamSummary: input.teamSummary ?? "Nao informado",
      qualitySound: input.qualitySound,
      qualityMicrophone: input.qualityMicrophone,
      notes: input.notes,
    },
  });

  await updateReportExtraFields(id, {
    titleSchedule: input.titleSchedule,
    transportType: input.transportType,
    uberGoValue: input.uberGoValue,
    uberReturnValue: input.uberReturnValue,
    otherCarResponsible: input.otherCarResponsible,
    hasExtraHours: input.hasExtraHours,
    extraHoursDetails: input.extraHoursDetails,
    outsideBrasilia: input.outsideBrasilia ?? false,
    exclusiveEvent: input.exclusiveEvent ?? false,
    teamGeneralDescription: input.teamGeneralDescription,
    teamGeneralScore: input.teamGeneralScore,
    eventDifficulties: input.eventDifficulties,
    eventDifficultyScore: input.eventDifficultyScore,
    eventQualityScore: input.eventQualityScore,
    speakerNumber: input.speakerNumber,
    electronicsNotes: input.electronicsNotes,
  });

  await prisma.reportFeedback.deleteMany({
    where: { reportId: id },
  });

  if (input.feedbacks?.length) {
    await prisma.reportFeedback.createMany({
      data: input.feedbacks.map((feedback) => ({
        reportId: id,
        memberId: feedback.memberId,
        feedback: feedback.feedback,
      })),
    });
  }

  return getReportById(id);
}

export async function getReportById(
  id: string
): Promise<ReportRecord | undefined> {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      media: true,
      feedbacks: {
        include: {
          member: { select: { name: true, lastName: true } },
        },
      },
      author: { select: { name: true, lastName: true } },
    },
  });
  if (!report) {
    return undefined;
  }

  const extra = await getReportExtraFields(report.id);
  return toReportRecord({ ...report, ...extra });
}

export async function listReports(): Promise<ReportRecord[]> {
  const reports = await prisma.report.findMany({
    include: {
      media: true,
      feedbacks: {
        include: {
          member: { select: { name: true, lastName: true } },
        },
      },
      author: { select: { name: true, lastName: true } },
    },
  });
  return reports.map((report) => toReportRecord(report));
}

export async function deleteReport(id: string): Promise<boolean> {
  const result = await prisma.report.deleteMany({
    where: { id },
  });
  return result.count > 0;
}

export async function listFeedbacksForMember(
  memberId: string
): Promise<MemberFeedbackRecord[]> {
  const feedbacks = await prisma.reportFeedback.findMany({
    where: { memberId },
    include: { report: true },
  });

  return feedbacks.map((entry) => ({
    id: entry.id,
    reportId: entry.reportId,
    memberId: entry.memberId,
    feedback: entry.feedback,
    eventDate: entry.report.eventDate,
    contractorName: entry.report.contractorName,
    createdAt: entry.createdAt,
  }));
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
