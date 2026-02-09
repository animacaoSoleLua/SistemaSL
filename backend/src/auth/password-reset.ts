import { randomBytes } from "node:crypto";
import { prisma } from "../db/prisma.js";

const TOKEN_BYTES = 3;
const TOKEN_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export async function issuePasswordResetToken(email: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const normalized = normalizeEmail(email);
  const token = createToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { email: normalized },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      email: normalized,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function verifyPasswordResetToken(
  email: string,
  token: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const existing = await prisma.passwordResetToken.findFirst({
    where: {
      email: normalized,
      token,
      expiresAt: { gt: now },
    },
  });

  return Boolean(existing);
}

export async function consumePasswordResetToken(
  email: string,
  token: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  const existing = await prisma.passwordResetToken.findFirst({
    where: {
      email: normalized,
      token,
      expiresAt: { gt: now },
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.passwordResetToken.delete({ where: { id: existing.id } });
  return true;
}
