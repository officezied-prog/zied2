/**
 * Password hashing — scrypt from node:crypto, no external dependency.
 * Stored format: scrypt$<N>$<saltHex>$<hashHex>
 */
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);
const N = 16384, KEYLEN = 64;

export const MIN_PASSWORD = 8;

/** Rejects the passwords that make an account worthless. */
export function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) return `password must be at least ${MIN_PASSWORD} characters`;
  if (pw.length > 256) return "password is too long";
  if (/^\d+$/.test(pw)) return "password must not be digits only";
  if (["password", "12345678", "qwertyui", "rabith12"].includes(pw.toLowerCase())) return "password is too common";
  return null;
}

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, n, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const key = await scrypt(pw, Buffer.from(saltHex, "hex"), hashHex.length / 2, { N: Number(n) || N });
    const expected = Buffer.from(hashHex, "hex");
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch { return false; }
}

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");
