import { createHmac } from "node:crypto";
import type { UserRecord } from "./store.js";

export interface AccessTokenPayload {
  sub: string;
  name: string;
  role: UserRecord["role"];
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 60;

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(input).digest("base64");
  return base64UrlEncode(digest);
}

function getSecret(): string {
  return process.env.JWT_SECRET ?? "dev-secret";
}

export function createAccessToken(user: UserRecord): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: user.id,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + DEFAULT_TTL_SECONDS,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`, getSecret());

  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, getSecret());
  if (signature !== expected) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as AccessTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
