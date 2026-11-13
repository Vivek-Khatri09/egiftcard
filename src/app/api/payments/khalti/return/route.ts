import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcilePayment } from "@/lib/payments/reconcile";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Khalti's return URL is NOT signed. We only use the pidx to find OUR payment, then ask Khalti's lookup API. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  if (await limited("pay-return", 60, 60)) return NextResponse.redirect(`${origin}/account/orders?payment=error`);
  const pidx = searchParams.get("pidx");
  if (!pidx || pidx.length > 64) return NextResponse.redirect(`${origin}/account/orders?payment=invalid`);

  const { data: pay } = await createAdminClient()
    .from("payments").select("id").eq("method", "khalti").eq("provider_reference", pidx).maybeSingle();
  if (!pay) return NextResponse.redirect(`${origin}/account/orders?payment=invalid`);

  const { outcome, orderId } = await reconcilePayment(pay.id);
  return NextResponse.redirect(`${origin}/account/orders/${orderId}?payment=${outcome}`);
}
