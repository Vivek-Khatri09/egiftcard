"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { queueEmail, queuePaidEmails } from "@/lib/email/notify";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Approve: the admin must type the amount actually received, and it must equal the order total. */
export async function approveBankPayment(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const id = str(fd, "paymentId");
  if (!z.string().uuid().safeParse(id).success) return { ...emptyFormState, message: "Invalid payment." };
  const received = Number(str(fd, "received"));
  if (!Number.isFinite(received) || received <= 0) return { ...emptyFormState, message: "Enter the amount you received." };

  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("id, order_id, method, status, amount_npr").eq("id", id).maybeSingle();
  if (!pay || pay.method !== "bank_transfer" || pay.status !== "pending_verification") return { ...emptyFormState, message: "This payment is no longer waiting for review." };
  if (Math.round(received * 100) !== Math.round(Number(pay.amount_npr) * 100)) {
    return { ...emptyFormState, message: `The amount received (Rs. ${received}) does not match the order total (Rs. ${pay.amount_npr}). Reject it, or ask the customer to pay the difference.` };
  }

  const { data, error } = await db.rpc("confirm_payment", { p_payment_id: id, p_amount: Number(pay.amount_npr), p_provider_txn: null, p_raw: { verified_manually: true }, p_verified_by: user.id });
  if (error) { console.error("confirm_payment failed:", error.message); return { ...emptyFormState, message: "Could not confirm the payment. Nothing was changed." }; }
  await writeAudit(user.id, "payment.bank_verified", "payment", id, { result: data });
  queuePaidEmails(String(pay.order_id), data);
  revalidatePath("/admin/payments");
  return { ...emptyFormState, ok: true, message: data === "paid_fulfilment_failed" ? "Payment confirmed, but codes could not be allocated. The order is flagged." : "Payment verified and codes allocated." };
}

export async function rejectBankPayment(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const id = str(fd, "paymentId");
  const note = str(fd, "note").trim().slice(0, 300);
  if (!z.string().uuid().safeParse(id).success) return { ...emptyFormState, message: "Invalid payment." };
  if (note.length < 3) return { ...emptyFormState, message: "Add a short reason for the rejection." };

  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("order_id").eq("id", id).maybeSingle();
  const { error } = await db.rpc("reject_bank_payment", { p_payment_id: id, p_admin: user.id, p_note: note });
  if (error) return { ...emptyFormState, message: "This payment is no longer waiting for review." };
  if (pay?.order_id) queueEmail(String(pay.order_id), `payment_rejected:${id}`);
  await writeAudit(user.id, "payment.bank_rejected", "payment", id, { note });
  revalidatePath("/admin/payments");
  return { ...emptyFormState, ok: true, message: "Payment rejected. The customer can submit it again." };
}
