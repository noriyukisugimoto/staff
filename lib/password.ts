import { createHash } from "node:crypto";

export function hashPassword(rawPassword: string): string {
  return createHash("sha256").update(rawPassword).digest("hex");
}

export function verifyPassword(rawPassword: string, hash: string): boolean {
  return hashPassword(rawPassword) === hash;
}
