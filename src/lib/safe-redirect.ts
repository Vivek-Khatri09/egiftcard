/** Only allow same-site relative paths, to prevent open redirects. */
export function safeNext(raw: unknown, fallback = "/account"): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
