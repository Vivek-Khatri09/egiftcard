import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEsewaReturn } from "@/lib/payments/esewa";
import { reconcilePayment } from "@/lib/payments/reconcile";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** eSewa sends the customer here. We never trust this redirect: we re-check the payment with eSewa's status API. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  if (await limited("pay-return", 60, 60)) return NextResponse.redirect(`${origin}/account/orders?payment=error`);
  const data = searchParams.get("data");
  const parsed = data ? parseEsewaReturn(data) : null;
  if (!parsed) return NextResponse.redirect(`${origin}/account/orders?payment=invalid`);

  const { data: pay } = await createAdminClient()
    .from("payments").select("id").eq("method", "esewa").eq("provider_reference", parsed.transaction_uuid).maybeSingle();
  if (!pay) return NextResponse.redirect(`${origin}/account/orders?payment=invalid`);

  const { outcome, orderId } = await reconcilePayment(pay.id);
  return NextResponse.redirect(`${origin}/account/orders/${orderId}?payment=${outcome}`);
}
