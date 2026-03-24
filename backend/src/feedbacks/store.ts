import { FeedbackType, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export { FeedbackType };

export interface FeedbackMemberRecord {
  id: string;
  name: string;
  lastName: string | null;
  role: string;
}

export interface FeedbackRecord {
  id: string;
  createdBy: string;
  type: FeedbackType;
  text: string | null;
  audioUrl: string | null;
  createdAt: Date;
  creator: { id: string; name: string; lastName: string | null };
  members: FeedbackMemberRecord[];
}

export interface CreateFeedbackInput {
  createdBy: string;
  type: FeedbackType;
  text?: string;
  audioUrl?: string;
  memberIds: string[];
}

export interface ListFeedbacksParams {
  type?: FeedbackType;
  memberId?: string;
  memberRole?: string;
  page?: number;
  limit?: number;
}

export interface ListFeedbacksResult {
  feedbacks: FeedbackRecord[];
  total: number;
  pages: number;
}

function mapFeedback(
  row: {
    id: string;
    createdBy: string;
    type: FeedbackType;
    text: string | null;
    audioUrl: string | null;
    createdAt: Date;
    creator: { id: string; name: string; lastName: string | null };
    members: Array<{
      member: { id: string; name: string; lastName: string | null; role: string };
    }>;
  }
): FeedbackRecord {
  return {
    id: row.id,
    createdBy: row.createdBy,
    type: row.type,
    text: row.text,
    audioUrl: row.audioUrl,
    createdAt: row.createdAt,
    creator: row.creator,
    members: row.members.map((m) => ({
      id: m.member.id,
      name: m.member.name,
      lastName: m.member.lastName,
      role: m.member.role,
    })),
  };
}

const memberInclude = {
  creator: { select: { id: true, name: true, lastName: true } },
  members: {
    include: {
      member: { select: { id: true, name: true, lastName: true, role: true } },
    },
  },
};

export async function createFeedback(
  input: CreateFeedbackInput
): Promise<FeedbackRecord> {
  const feedback = await prisma.clientFeedback.create({
    data: {
      createdBy: input.createdBy,
      type: input.type,
      text: input.text ?? null,
      audioUrl: input.audioUrl ?? null,
      members: {
        create: input.memberIds.map((memberId) => ({ memberId })),
      },
    },
    include: memberInclude,
  });

  return mapFeedback(feedback);
}

export async function listFeedbacks(
  params: ListFeedbacksParams = {}
): Promise<ListFeedbacksResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const where: Prisma.ClientFeedbackWhereInput = {};

  if (params.type) {
    where.type = params.type;
  }

  if (params.memberId) {
    where.members = { some: { memberId: params.memberId } };
  } else if (params.memberRole) {
    where.members = { some: { member: { role: params.memberRole as UserRole } } };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.clientFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: memberInclude,
    }),
    prisma.clientFeedback.count({ where }),
  ]);

  return {
    feedbacks: rows.map(mapFeedback),
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getFeedbackById(
  id: string
): Promise<FeedbackRecord | undefined> {
  const feedback = await prisma.clientFeedback.findUnique({
    where: { id },
    include: memberInclude,
  });
  if (!feedback) return undefined;
  return mapFeedback(feedback);
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const existing = await prisma.clientFeedback.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.clientFeedback.delete({ where: { id } });
  return true;
}
