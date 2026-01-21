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
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + 1);
  return next;
}

function isSuspensionActive(suspension: SuspensionRecord, now: Date): boolean {
  return (
    suspension.startDate.getTime() <= now.getTime() &&
    now.getTime() <= suspension.endDate.getTime()
  );
}

async function countActiveWarnings(memberId: string): Promise<number> {
  return prisma.warning.count({
    where: { memberId, deletedAt: null },
  });
}

async function ensureSuspension(memberId: string, startDate: Date): Promise<void> {
  const now = new Date();
  const existing = await prisma.suspension.findFirst({
    where: {
      memberId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (existing) {
    return;
  }

  await prisma.suspension.create({
    data: {
      memberId,
      startDate,
      endDate: addOneMonth(startDate),
      reason: "3 advertencias",
    },
  });
}

async function clearSuspensionIfNeeded(memberId: string): Promise<void> {
  const count = await countActiveWarnings(memberId);
  if (count < 3) {
    await prisma.suspension.deleteMany({ where: { memberId } });
  }
}

export async function createWarning(
  createdBy: string,
  input: CreateWarningInput
): Promise<WarningRecord> {
  const warning = await prisma.warning.create({
    data: {
      memberId: input.memberId,
      createdBy,
      reason: input.reason,
      warningDate: input.warningDate,
    },
  });

  if ((await countActiveWarnings(input.memberId)) >= 3) {
    await ensureSuspension(input.memberId, input.warningDate);
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

export async function listWarnings(options?: {
  includeDeleted?: boolean;
}): Promise<WarningRecord[]> {
  const includeDeleted = options?.includeDeleted ?? false;
  const warnings = await prisma.warning.findMany({
    where: includeDeleted ? undefined : { deletedAt: null },
  });

  return warnings.map((warning) => ({
    id: warning.id,
    memberId: warning.memberId,
    createdBy: warning.createdBy,
    reason: warning.reason,
    warningDate: warning.warningDate,
    createdAt: warning.createdAt,
    deletedAt: warning.deletedAt ?? undefined,
  }));
}

export async function listWarningsForMember(
  memberId: string,
  options?: { includeDeleted?: boolean }
): Promise<WarningRecord[]> {
  const includeDeleted = options?.includeDeleted ?? false;
  const warnings = await prisma.warning.findMany({
    where: {
      memberId,
      deletedAt: includeDeleted ? undefined : null,
    },
  });

  return warnings.map((warning) => ({
    id: warning.id,
    memberId: warning.memberId,
    createdBy: warning.createdBy,
    reason: warning.reason,
    warningDate: warning.warningDate,
    createdAt: warning.createdAt,
    deletedAt: warning.deletedAt ?? undefined,
  }));
}

export async function listWarningsByCreator(
  creatorId: string,
  options?: { includeDeleted?: boolean }
): Promise<WarningRecord[]> {
  const includeDeleted = options?.includeDeleted ?? false;
  const warnings = await prisma.warning.findMany({
    where: {
      createdBy: creatorId,
      deletedAt: includeDeleted ? undefined : null,
    },
  });

  return warnings.map((warning) => ({
    id: warning.id,
    memberId: warning.memberId,
    createdBy: warning.createdBy,
    reason: warning.reason,
    warningDate: warning.warningDate,
    createdAt: warning.createdAt,
    deletedAt: warning.deletedAt ?? undefined,
  }));
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
