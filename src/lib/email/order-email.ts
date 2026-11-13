import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/payments/config";
import { renderEmail, type EmailData, type EmailKind } from "./templates";
import { sendMail } from "./send";

const KINDS: EmailKind[] = ["order_confirmation", "payment_confirmation", "gift_card_delivery", "payment_rejected", "order_cancelled"];
const METHOD: Record<string, string> = { esewa: "eSewa", khalti: "Khalti", bank_transfer: "Bank transfer" };

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

/**
 * Sends ONE email per (order, template). Safe to call any number of times:
 * the database claim makes sure it is never sent twice, and a failure is recorded so it can be retried.
 * `templateKey` is a kind, optionally followed by ":<id>" (e.g. "payment_rejected:<paymentId>").
 */
export async function sendOrderEmail(orderId: string, templateKey: string, opts: { force?: boolean } = {}): Promise<SendResult> {
  const [kindRaw, extra] = templateKey.split(":");
  const kind = kindRaw as EmailKind;
  if (!KINDS.includes(kind)) return { status: "failed", error: "Unknown email template" };

  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, user_id, status, fulfillment_status, payment_method, subtotal_npr, discount_npr, total_npr, order_items(product_name, quantity, unit_price_npr)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { status: "failed", error: "Order not found" };

  const { data: claim } = await db.rpc("claim_email_delivery", { p_order_id: orderId, p_user_id: order.user_id, p_template: templateKey, p_force: Boolean(opts.force) });
  if (!claim) return { status: "skipped" }; // already sent, or another worker is sending it

  try {
    if (kind === "gift_card_delivery" && !(order.status === "completed" && order.fulfillment_status === "delivered")) {
      throw new Error("Order is not ready for delivery");
    }

    const [{ data: profile }, { data: contactRow }] = await Promise.all([
      db.from("profiles").select("full_name, email").eq("id", order.user_id).maybeSingle(),
      db.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    ]);
    if (!profile?.email) throw new Error("Customer has no email address");

    let codes: EmailData["codes"] = [];
    if (kind === "gift_card_delivery") {
      const { data } = await db.from("gift_card_codes").select("code, pin, order_items(product_name)").eq("order_id", orderId).eq("status", "sold").order("sold_at");
      codes = ((data ?? []) as unknown as { code: string; pin: string | null; order_items: { product_name: string } | null }[]).map((c) => ({ product: c.order_items?.product_name ?? "Gift card", code: c.code, pin: c.pin }));
      if (codes.length === 0) throw new Error("No codes found for this order");
    }

    let note: string | undefined;
    if (kind === "payment_rejected" && extra) {
      const { data: p } = await db.from("payments").select("note").eq("id", extra).maybeSingle();
      note = (p?.note as string | null)?.replace(/\s*\(ref [^)]*\)\s*$/, "") || undefined;
    }

    const contact = (contactRow?.value ?? {}) as Partial<EmailData["support"]>;
    const data: EmailData = {
      siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Egiftcard",
      siteUrl: siteUrl(),
      customerName: (profile.full_name as string | null)?.split(" ")[0] || "there",
      orderNumber: order.order_number,
      orderId: order.id,
      items: ((order.order_items ?? []) as { product_name: string; quantity: number; unit_price_npr: number }[]).map((i) => ({ name: i.product_name, quantity: i.quantity, unitPrice: Number(i.unit_price_npr) })),
      subtotal: Number(order.subtotal_npr),
      discount: Number(order.discount_npr),
      total: Number(order.total_npr),
      paymentMethod: METHOD[order.payment_method] ?? order.payment_method,
      codes,
      support: { email: contact.email ?? "[business email]", phone: contact.phone ?? "[business phone]", address: contact.address ?? "" },
      note,
    };

    const { subject, html, text } = renderEmail(kind, data);
    await sendMail(profile.email as string, subject, html, text);
    await db.from("email_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, locked_until: null }).eq("id", claim);
    return { status: "sent" };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : "Unknown error").slice(0, 300); // never includes codes
    await db.from("email_deliveries").update({ status: "failed", last_error: msg, locked_until: null }).eq("id", claim);
    return { status: "failed", error: msg };
  }
}
