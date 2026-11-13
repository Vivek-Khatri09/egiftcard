import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel, x-forwarded-for is set by the platform. Behind your own proxy, make sure it cannot be spoofed.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Returns TRUE when the caller has exceeded `max` hits within `windowSec` seconds.
 * The limit is per client IP unless an `identifier` (user id, email...) is given.
 * If the limiter itself fails, requests are allowed (and the error is logged) so an outage never blocks customers.
 */
export async function limited(action: string, max: number, windowSec: number, identifier?: string): Promise<boolean> {
  try {
    const who = identifier ?? (await clientIp());
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: `${action}:${who}`.slice(0, 200), p_window_seconds: windowSec, p_max: max });
    if (error) {
      console.error("rate limiter error:", error.message);
      return false;
    }
    return data === false;
  } catch (e) {
    console.error("rate limiter crashed:", e);
    return false;
  }
}
