import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/email/order-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retries failed or stuck emails. Call it on a schedule with `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data } = await db
    .from("email_deliveries").select("order_id, template")
    .in("status", ["failed", "pending"]).lt("attempts", 5).lt("last_attempt_at", cutoff).limit(20);

  const results = { sent: 0, failed: 0, skipped: 0 };
  for (const d of (data ?? []) as { order_id: string; template: string }[]) {
    const r = await sendOrderEmail(d.order_id, d.template);
    results[r.status]++;
  }
  return NextResponse.json({ ok: true, ...results });
}
