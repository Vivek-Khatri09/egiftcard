import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { esewaStatusCheck, fmtAmount } from "./esewa";
import { khaltiLookup } from "./khalti";
import { queuePaidEmails } from "@/lib/email/notify";

export type Outcome = "paid" | "pending" | "failed" | "error";

/**
 * Asks the PROVIDER whether a payment really completed, and only then confirms it in the database.
 * Safe to call repeatedly (success redirect, "refresh status" button, retries): confirm_payment is idempotent.
 */
export async function reconcilePayment(paymentId: string): Promise<{ outcome: Outcome; orderId: string | null }> {
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("id, order_id, method, status, amount_npr, provider_reference").eq("id", paymentId).maybeSingle();
  if (!pay) return { outcome: "error", orderId: null };
  const orderId = pay.order_id as string;
  if (pay.status === "paid") return { outcome: "paid", orderId };
  if (pay.status === "failed" || pay.status === "cancelled") return { outcome: "failed", orderId };
  const amount = Number(pay.amount_npr);

  const markFailed = async (raw: unknown) => {
    await db.from("payments").update({ status: "failed", raw_response: raw as object }).eq("id", pay.id).in("status", ["initiated"]);
    return { outcome: "failed" as Outcome, orderId };
  };
  const confirm = async (txn: string | null, raw: unknown) => {
    const { data, error } = await db.rpc("confirm_payment", { p_payment_id: pay.id, p_amount: amount, p_provider_txn: txn, p_raw: raw as object, p_verified_by: null });
    if (error) {
      console.error("confirm_payment failed:", error.message);
      return { outcome: "error" as Outcome, orderId };
    }
    if (data !== "already_paid") {
      await writeAudit(null, "payment.confirmed", "payment", pay.id, { method: pay.method, result: data });
      queuePaidEmails(orderId, data);
    }
    return { outcome: "paid" as Outcome, orderId };
  };

  if (pay.method === "esewa") {
    const s = await esewaStatusCheck(String(pay.provider_reference ?? pay.id), amount);
    if (!s) return { outcome: "error", orderId };
    if (s.status === "COMPLETE") {
      // Defence in depth: eSewa must echo the same transaction and amount we asked about.
      const sameTxn = !s.transaction_uuid || s.transaction_uuid === String(pay.provider_reference ?? pay.id);
      const sameAmount = s.total_amount === undefined || Number(s.total_amount) === amount;
      if (!sameTxn || !sameAmount) return { outcome: "error", orderId };
      return confirm(s.ref_id ? String(s.ref_id) : null, s);
    }
    if (s.status === "CANCELED") return markFailed(s);
    return { outcome: "pending", orderId }; // PENDING, AMBIGUOUS, NOT_FOUND (not paid yet) or refunds: never treat as paid
  }

  if (pay.method === "khalti") {
    if (!pay.provider_reference) return { outcome: "error", orderId };
    const l = await khaltiLookup(String(pay.provider_reference));
    if (!l) return { outcome: "error", orderId };
    if (l.status === "Completed") {
      if (Number(l.total_amount) !== Math.round(amount * 100)) return { outcome: "error", orderId }; // amount must match to the paisa
      return confirm(l.transaction_id ? String(l.transaction_id) : null, l);
    }
    if (l.status === "Pending" || l.status === "Initiated") return { outcome: "pending", orderId };
    return markFailed(l); // User canceled, Expired, Refunded...
  }

  return { outcome: "pending", orderId }; // bank transfers are verified by an admin
}

export { fmtAmount };
