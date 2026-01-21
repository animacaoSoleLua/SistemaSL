import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return [
    HASH_PREFIX,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export function verifyPassword(
  password: string,
  stored: string
): { valid: boolean; needsRehash: boolean } {
  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    const valid = safeEqual(password, stored);
    return { valid, needsRehash: valid };
  }

  const parts = stored.split("$");
  if (parts.length !== 3) {
    return { valid: false, needsRehash: false };
  }

  const [, saltBase64, hashBase64] = parts;
  const salt = Buffer.from(saltBase64, "base64");
  const expected = Buffer.from(hashBase64, "base64");
  const derived = scryptSync(password, salt, expected.length);
  const valid =
    derived.length === expected.length &&
    timingSafeEqual(derived, expected);

  return { valid, needsRehash: false };
}
