import { prisma } from "../db/prisma.js";

export interface SkillRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface MemberSkillRecord {
  id: string;
  memberId: string;
  skillId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillWithMembers extends SkillRecord {
  members: {
    memberId: string;
    memberName: string;
    memberLastName: string | null;
    photoUrl: string | null;
    rating: number;
  }[];
}

export async function listSkills(): Promise<SkillWithMembers[]> {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        orderBy: { rating: "desc" },
        include: {
          member: {
            select: { id: true, name: true, lastName: true, photoUrl: true },
          },
        },
      },
    },
  });

  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    createdAt: skill.createdAt,
    members: skill.members.map((ms) => ({
      memberId: ms.member.id,
      memberName: ms.member.name,
      memberLastName: ms.member.lastName ?? null,
      photoUrl: ms.member.photoUrl ?? null,
      rating: ms.rating,
    })),
  }));
}

export async function getSkillById(id: string): Promise<SkillRecord | undefined> {
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) return undefined;
  return { id: skill.id, name: skill.name, description: skill.description, createdAt: skill.createdAt };
}

export async function createSkill(input: {
  name: string;
  description?: string;
}): Promise<SkillRecord> {
  const skill = await prisma.skill.create({
    data: { name: input.name.trim(), description: input.description?.trim() ?? null },
  });
  return { id: skill.id, name: skill.name, description: skill.description, createdAt: skill.createdAt };
}

export async function updateSkill(
  id: string,
  input: { name?: string; description?: string | null }
): Promise<SkillRecord | undefined> {
  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) return undefined;
  const updated = await prisma.skill.update({
    where: { id },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? (input.description?.trim() ?? null) : existing.description,
    },
  });
  return { id: updated.id, name: updated.name, description: updated.description, createdAt: updated.createdAt };
}

export async function deleteSkill(id: string): Promise<boolean> {
  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.skill.delete({ where: { id } });
  return true;
}

export async function addMemberSkill(input: {
  memberId: string;
  skillId: string;
  rating: number;
}): Promise<MemberSkillRecord> {
  const ms = await prisma.memberSkill.create({
    data: { memberId: input.memberId, skillId: input.skillId, rating: input.rating },
  });
  return { id: ms.id, memberId: ms.memberId, skillId: ms.skillId, rating: ms.rating, createdAt: ms.createdAt, updatedAt: ms.updatedAt };
}

export async function updateMemberSkill(
  skillId: string,
  memberId: string,
  rating: number
): Promise<MemberSkillRecord | undefined> {
  const existing = await prisma.memberSkill.findUnique({
    where: { memberId_skillId: { memberId, skillId } },
  });
  if (!existing) return undefined;
  const updated = await prisma.memberSkill.update({
    where: { memberId_skillId: { memberId, skillId } },
    data: { rating },
  });
  return { id: updated.id, memberId: updated.memberId, skillId: updated.skillId, rating: updated.rating, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
}

export async function removeMemberSkill(
  skillId: string,
  memberId: string
): Promise<boolean> {
  const existing = await prisma.memberSkill.findUnique({
    where: { memberId_skillId: { memberId, skillId } },
  });
  if (!existing) return false;
  await prisma.memberSkill.delete({ where: { memberId_skillId: { memberId, skillId } } });
  return true;
}

export async function listSkillsForMember(
  memberId: string
): Promise<{ skillId: string; name: string; description: string | null; rating: number }[]> {
  const entries = await prisma.memberSkill.findMany({
    where: { memberId },
    orderBy: { rating: "desc" },
    include: { skill: { select: { name: true, description: true } } },
  });
  return entries.map((ms) => ({
    skillId: ms.skillId,
    name: ms.skill.name,
    description: ms.skill.description,
    rating: ms.rating,
  }));
}
