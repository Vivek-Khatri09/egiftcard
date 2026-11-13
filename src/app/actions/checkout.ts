"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { enabledMethods, esewaConfig, khaltiConfig } from "@/lib/payments/config";
import { buildEsewaForm } from "@/lib/payments/esewa";
import { khaltiInitiate } from "@/lib/payments/khalti";
import { reconcilePayment } from "@/lib/payments/reconcile";
import { queueEmail } from "@/lib/email/notify";
import { limited, TOO_MANY } from "@/lib/rate-limit";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const uuid = z.string().uuid();
const METHODS = ["esewa", "khalti", "bank_transfer"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Shows the customer the discount before they commit. The real check happens again when the order is created. */
export async function previewCoupon(code: string): Promise<{ ok: boolean; discount: number; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, discount: 0, message: "Please log in first." };
  if (await limited("coupon", 30, 600, user.id)) return { ok: false, discount: 0, message: TOO_MANY };
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 40) return { ok: false, discount: 0, message: "Enter a coupon code." };

  const { data: items } = await supabase.from("cart_items").select("product_id, quantity");
  const rows = (items ?? []) as { product_id: string; quantity: number }[];
  if (rows.length === 0) return { ok: false, discount: 0, message: "Your cart is empty." };
  const { data: products } = await supabase.from("products_public").select("id, selling_price_npr").in("id", rows.map((r) => r.product_id));
  const price = new Map(((products ?? []) as { id: string; selling_price_npr: number }[]).map((p) => [p.id, Number(p.selling_price_npr)]));
  const subtotal = rows.reduce((n, r) => n + (price.get(r.product_id) ?? 0) * r.quantity, 0);

  const { data, error } = await createAdminClient().rpc("validate_coupon", { p_code: trimmed, p_subtotal: subtotal });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { ok: false, discount: 0, message: "We couldn't check that coupon. Please try again." };
  if (row.error) return { ok: false, discount: 0, message: String(row.error) };
  return { ok: true, discount: Number(row.discount), message: "Coupon applied." };
}

export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireUser();
  const method = str(fd, "method");
  const coupon = str(fd, "coupon").trim();
  const accepted = fd.get("accepted") === "on";
  const values = { method, coupon };
  if (await limited("place-order", 15, 3600, user.id)) return { ...emptyFormState, message: TOO_MANY, values };

  if (!(METHODS as readonly string[]).includes(method)) return { ...emptyFormState, message: "Choose a payment method.", values };
  if (!accepted) return { ...emptyFormState, message: "Please confirm that you accept the no-refund policy.", errors: { accepted: "Required" }, values };
  if (!enabledMethods()[method as "esewa" | "khalti" | "bank_transfer"]) return { ...emptyFormState, message: "That payment method isn't available. Please choose another.", values };

  const { data, error } = await createAdminClient().rpc("create_checkout_order", {
    p_user_id: user.id, p_method: method, p_coupon_code: coupon || null, p_accepted_no_refund: true,
  });
  if (error || !data) {
    const m = error?.message ?? "";
    if (m.includes("insufficient_stock:")) return { ...emptyFormState, message: `Sorry, there isn't enough stock of "${m.split("insufficient_stock:")[1]?.trim()}" any more. Please update your cart.`, values };
    if (m.includes("coupon_invalid:")) return { ...emptyFormState, message: m.split("coupon_invalid:")[1]?.trim() || "That coupon can't be used.", errors: { coupon: "Invalid" }, values };
    if (m.includes("cart_empty")) return { ...emptyFormState, message: "Your cart is empty.", values };
    if (m.includes("unavailable_item")) return { ...emptyFormState, message: "An item in your cart is no longer available. Please review your cart.", values };
    console.error("create_checkout_order failed:", m);
    return { ...emptyFormState, message: "We couldn't place your order. Please try again.", values };
  }
  await writeAudit(user.id, "order.created", "order", String(data), { method });
  queueEmail(String(data), "order_confirmation");
  revalidatePath("/", "layout");
  redirect(`/checkout/pay/${data}`);
}

export type PayResult =
  | { ok: true; kind: "form"; url: string; fields: Record<string, string> }
  | { ok: true; kind: "redirect"; url: string }
  | { ok: false; message: string };

/** Creates one payment attempt and returns what the browser needs to send the customer to the gateway. */
export async function initiatePayment(orderId: string): Promise<PayResult> {
  const { user } = await requireUser();
  if (!uuid.safeParse(orderId).success) return { ok: false, message: "Invalid order." };
  if (await limited("pay-init", 30, 3600, user.id)) return { ok: false, message: TOO_MANY };
  const db = createAdminClient();

  const { data: order } = await db.from("orders").select("id, order_number, user_id, status, payment_method, total_npr, expires_at").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return { ok: false, message: "Order not found." };
  if (order.status !== "pending_payment") return { ok: false, message: "This order can't be paid any more." };
  if (order.expires_at && new Date(order.expires_at) < new Date()) return { ok: false, message: "This order has expired. Please place it again from your cart." };

  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("order_id", orderId);
  if ((count ?? 0) >= 10) return { ok: false, message: "Too many payment attempts. Please contact us." };

  const amount = Number(order.total_npr);
  const paymentId = randomUUID(); // doubles as eSewa's transaction_uuid

  if (order.payment_method === "esewa") {
    if (!esewaConfig().configured) return { ok: false, message: "eSewa is not available right now." };
    const { error } = await db.from("payments").insert({ id: paymentId, order_id: orderId, method: "esewa", status: "initiated", amount_npr: amount, provider_reference: paymentId });
    if (error) return { ok: false, message: "We couldn't start the payment. Please try again." };
    const form = buildEsewaForm(paymentId, amount);
    return { ok: true, kind: "form", url: form.url, fields: form.fields };
  }

  if (order.payment_method === "khalti") {
    if (!khaltiConfig().configured) return { ok: false, message: "Khalti is not available right now." };
    const { data: profile } = await db.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle();
    const started = await khaltiInitiate({
      amountNpr: amount, purchaseOrderId: paymentId, purchaseOrderName: order.order_number,
      customer: { name: profile?.full_name ?? undefined, email: profile?.email ?? undefined, phone: profile?.phone ?? undefined },
    });
    if (!started) return { ok: false, message: "Khalti could not start the payment. Please try again in a moment." };
    const { error } = await db.from("payments").insert({ id: paymentId, order_id: orderId, method: "khalti", status: "initiated", amount_npr: amount, provider_reference: started.pidx });
    if (error) return { ok: false, message: "We couldn't start the payment. Please try again." };
    return { ok: true, kind: "redirect", url: started.paymentUrl };
  }

  return { ok: false, message: "This order is paid by bank transfer." };
}

/** Customer-triggered "I already paid, check again": asks the provider, never trusts the browser. */
export async function refreshPaymentStatus(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const orderId = str(fd, "orderId");
  if (!uuid.safeParse(orderId).success) return;
  if (await limited("pay-refresh", 30, 3600, user.id)) return;
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, user_id").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return;

  const { data: attempts } = await db.from("payments").select("id").eq("order_id", orderId).eq("status", "initiated").in("method", ["esewa", "khalti"]).order("created_at", { ascending: false }).limit(5);
  let outcome = "pending";
  for (const a of (attempts ?? []) as { id: string }[]) {
    const r = await reconcilePayment(a.id);
    if (r.outcome === "paid") { outcome = "paid"; break; }
  }
  revalidatePath("/", "layout");
  redirect(`/account/orders/${orderId}?payment=${outcome}`);
}

export async function cancelOrder(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const orderId = str(fd, "orderId");
  if (!uuid.safeParse(orderId).success) return;
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, user_id, status").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id || order.status !== "pending_payment") return;
  // A payment may be in flight at the gateway: check first, so we never cancel a paid order.
  const { data: open } = await db.from("payments").select("id").eq("order_id", orderId).eq("status", "initiated").in("method", ["esewa", "khalti"]);
  for (const p of (open ?? []) as { id: string }[]) {
    const r = await reconcilePayment(p.id);
    if (r.outcome === "paid") redirect(`/account/orders/${orderId}?payment=paid`);
  }
  const { data: released } = await db.rpc("release_order", { p_order_id: orderId, p_new_status: "cancelled" });
  await writeAudit(user.id, "order.cancelled", "order", orderId, null);
  if (released) queueEmail(orderId, "order_cancelled");
  revalidatePath("/", "layout");
  redirect("/account/orders");
}

export async function submitBankTransfer(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireUser();
  const orderId = str(fd, "orderId");
  const reference = str(fd, "reference").trim();
  const proofPath = str(fd, "proofPath").trim();
  const values = { reference };
  if (await limited("bank-submit", 10, 3600, user.id)) return { ...emptyFormState, message: TOO_MANY, values };

  if (!uuid.safeParse(orderId).success) return { ...emptyFormState, message: "Invalid order.", values };
  if (!/^[A-Za-z0-9\-_/. ]{4,64}$/.test(reference)) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: { reference: "Enter the transaction reference from your bank (4 to 64 letters, numbers or - _ / .)" }, values };
  if (!proofPath.startsWith(`${user.id}/`) || !/^[A-Za-z0-9._\-/]{10,200}\.(jpg|jpeg|png|webp|pdf)$/i.test(proofPath)) return { ...emptyFormState, message: "Please upload your payment proof first.", errors: { proof: "Required" }, values };

  const db = createAdminClient();
  const { error: fileErr } = await db.storage.from("payment-proofs").createSignedUrl(proofPath, 60); // fails if the file does not exist
  if (fileErr) return { ...emptyFormState, message: "We couldn't find your uploaded proof. Please upload it again.", errors: { proof: "Not found" }, values };

  const { data, error } = await db.rpc("submit_bank_transfer", { p_order_id: orderId, p_user_id: user.id, p_reference: reference, p_proof_path: proofPath });
  if (error || !data) {
    if (error?.code === "23505") return { ...emptyFormState, message: "That transaction reference has already been used.", errors: { reference: "Already used" }, values };
    if (error?.message.includes("order_not_payable")) return { ...emptyFormState, message: "This order can't accept a payment right now.", values };
    console.error("submit_bank_transfer failed:", error?.message);
    return { ...emptyFormState, message: "We couldn't submit your payment. Please try again.", values };
  }
  await writeAudit(user.id, "payment.bank_submitted", "payment", String(data), { order_id: orderId });
  revalidatePath("/", "layout");
  redirect(`/account/orders/${orderId}?payment=submitted`);
}
