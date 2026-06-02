import crypto from "node:crypto";
import argon2 from "argon2";

export async function hashPasswordModern(password) {
  return `argon2$${await argon2.hash(String(password))}`;
}

export function isLegacyPasswordHash(stored = "") {
  return String(stored).startsWith("scrypt$");
}

export function hashPasswordLegacy(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function verifyPassword(password, stored = "") {
  if (stored.startsWith("argon2$")) return argon2.verify(stored.slice("argon2$".length), String(password));
  if (!stored.includes("$")) return false;
  const [, salt, expected] = stored.split("$");
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && crypto.timingSafeEqual(actual, expectedBuffer);
}
