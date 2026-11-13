import { createHash } from "crypto";

/** Duplicate detection key: case-insensitive, whitespace-trimmed. */
export function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/** Returns an error message, or null when the code looks acceptable. */
export function validateCode(code: string): string | null {
  if (code.length < 4) return "Code is too short (minimum 4 characters)";
  if (code.length > 128) return "Code is too long (maximum 128 characters)";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(code)) return "Code contains invalid characters";
  return null;
}
