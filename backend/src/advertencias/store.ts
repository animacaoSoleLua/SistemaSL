import { addMonths, subMonths } from "date-fns";
import { prisma } from "../db/prisma.js";

export interface WarningRecord {
  id: string;
  memberId: string;
  createdBy: string;
  reason: string;
  warningDate: Date;
  createdAt: Date;
  deletedAt?: Date;
}

export interface SuspensionRecord {
  id: string;
  memberId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  createdAt: Date;
}

export interface CreateWarningInput {
  memberId: string;
  reason: string;
  warningDate: Date;
}

function addOneMonth(date: Date): Date {
  return addMonths(date, 1);
}

function subtractOneMonth(date: Date): Date {
  return subMonths(date, 1);
}

function isSuspensionActive(suspension: SuspensionRecord, now: Date): boolean {
  return (
    suspension.startDate.getTime() <= now.getTime() &&
    now.getTime() <= suspension.endDate.getTime()
  );
}

async function countWarningsInWindow(
  memberId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  return prisma.warning.count({
    where: {
      memberId,
      deletedAt: null,
      warningDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
}

async function ensureSuspension(
  memberId: string,
  startDate: Date
): Promise<boolean> {
  const now = new Date();
  const existing = await prisma.suspension.findFirst({
    where: {
      memberId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (existing) {
    return false;
  }

  await prisma.suspension.create({
    data: {
      memberId,
      startDate,
      endDate: addOneMonth(startDate),
      reason: "3 advertencias",
    },
  });
  return true;
}

async function clearSuspensionIfNeeded(memberId: string): Promise<void> {
  const now = new Date();
  const windowStart = subtractOneMonth(now);
  const count = await countWarningsInWindow(memberId, windowStart, now);
  if (count < 3) {
    await prisma.suspension.deleteMany({ where: { memberId } });
  }
}

export async function createWarning(
  createdBy: string,
  input: CreateWarningInput
): Promise<{ warning: WarningRecord; suspensionApplied: boolean }> {
  const warning = await prisma.warning.create({
    data: {
      memberId: input.memberId,
      createdBy,
      reason: input.reason,
      warningDate: input.warningDate,
    },
  });

  let suspensionApplied = false;
  const windowStart = subtractOneMonth(input.warningDate);
  const countInWindow = await countWarningsInWindow(
    input.memberId,
    windowStart,
    input.warningDate
  );
  if (countInWindow >= 3) {
    suspensionApplied = await ensureSuspension(input.memberId, input.warningDate);
  }

  return {
    warning: {
      id: warning.id,
      memberId: warning.memberId,
      createdBy: warning.createdBy,
      reason: warning.reason,
      warningDate: warning.warningDate,
      createdAt: warning.createdAt,
      deletedAt: warning.deletedAt ?? undefined,
    },
    suspensionApplied,
  };
}

export interface ListWarningsParams {
  memberId?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface ListWarningsResult {
  warnings: WarningRecord[];
  total: number;
  pages: number;
}

export async function listWarnings(params: ListWarningsParams = {}): Promise<ListWarningsResult> {
  const { memberId, createdBy, includeDeleted = false } = params;
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(memberId ? { memberId } : {}),
    ...(createdBy ? { createdBy } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.warning.findMany({
      where,
      orderBy: [{ warningDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.warning.count({ where }),
  ]);

  return {
    warnings: rows.map((warning) => ({
      id: warning.id,
      memberId: warning.memberId,
      createdBy: warning.createdBy,
      reason: warning.reason,
      warningDate: warning.warningDate,
      createdAt: warning.createdAt,
      deletedAt: warning.deletedAt ?? undefined,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

/** @deprecated Use listWarnings({ memberId }) */
export async function listWarningsForMember(
  memberId: string,
  options?: { includeDeleted?: boolean }
): Promise<WarningRecord[]> {
  const result = await listWarnings({ memberId, includeDeleted: options?.includeDeleted });
  return result.warnings;
}

/** @deprecated Use listWarnings({ createdBy }) */
export async function listWarningsByCreator(
  creatorId: string,
  options?: { includeDeleted?: boolean }
): Promise<WarningRecord[]> {
  const result = await listWarnings({ createdBy: creatorId, includeDeleted: options?.includeDeleted });
  return result.warnings;
}

export async function getWarningById(
  id: string
): Promise<WarningRecord | undefined> {
  const warning = await prisma.warning.findUnique({ where: { id } });
  if (!warning) {
    return undefined;
  }
  return {
    id: warning.id,
    memberId: warning.memberId,
    createdBy: warning.createdBy,
    reason: warning.reason,
    warningDate: warning.warningDate,
    createdAt: warning.createdAt,
    deletedAt: warning.deletedAt ?? undefined,
  };
}

export async function updateWarning(
  warningId: string,
  input: { reason?: string; warningDate?: Date }
): Promise<WarningRecord | undefined> {
  const warning = await prisma.warning.findUnique({
    where: { id: warningId },
  });
  if (!warning || warning.deletedAt) {
    return undefined;
  }

  const updated = await prisma.warning.update({
    where: { id: warningId },
    data: {
      reason: input.reason ?? warning.reason,
      warningDate: input.warningDate ?? warning.warningDate,
    },
  });

  return {
    id: updated.id,
    memberId: updated.memberId,
    createdBy: updated.createdBy,
    reason: updated.reason,
    warningDate: updated.warningDate,
    createdAt: updated.createdAt,
    deletedAt: updated.deletedAt ?? undefined,
  };
}

export async function deleteWarning(
  warningId: string,
  _deletedBy: string
): Promise<WarningRecord | undefined> {
  const warning = await prisma.warning.findUnique({
    where: { id: warningId },
  });
  if (!warning || warning.deletedAt) {
    return undefined;
  }

  const updated = await prisma.warning.update({
    where: { id: warningId },
    data: { deletedAt: new Date() },
  });

  await clearSuspensionIfNeeded(updated.memberId);

  return {
    id: updated.id,
    memberId: updated.memberId,
    createdBy: updated.createdBy,
    reason: updated.reason,
    warningDate: updated.warningDate,
    createdAt: updated.createdAt,
    deletedAt: updated.deletedAt ?? undefined,
  };
}

export async function getActiveSuspension(
  memberId: string,
  now: Date = new Date()
): Promise<SuspensionRecord | undefined> {
  const suspension = await prisma.suspension.findFirst({
    where: {
      memberId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (!suspension) {
    return undefined;
  }

  const record = {
    id: suspension.id,
    memberId: suspension.memberId,
    startDate: suspension.startDate,
    endDate: suspension.endDate,
    reason: suspension.reason ?? "",
    createdAt: suspension.createdAt,
  };

  if (!isSuspensionActive(record, now)) {
    return undefined;
  }
  return record;
}

export async function resetWarnings(): Promise<void> {
  await prisma.warning.deleteMany();
  await prisma.suspension.deleteMany();
}
