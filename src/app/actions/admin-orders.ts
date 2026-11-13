"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { queueEmail, queuePaidEmails } from "@/lib/email/notify";
import { sendOrderEmail } from "@/lib/email/order-email";

const getId = (fd: FormData) => {
  const id = String(fd.get("orderId") ?? "");
  return z.string().uuid().safeParse(id).success ? id : null;
};

/** Cancel an UNPAID order: frees its reserved codes and coupon. Paid orders can never be cancelled here. */
export async function adminCancelOrder(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = getId(fd);
  if (!id) return;
  const { data: released } = await createAdminClient().rpc("release_order", { p_order_id: id, p_new_status: "cancelled" });
  if (released) {
    await writeAudit(user.id, "order.cancelled_by_admin", "order", id, null);
    queueEmail(id, "order_cancelled");
  }
  revalidatePath(`/admin/orders/${id}`);
}

/** For orders flagged "paid but not delivered": try the allocation again (for example after adding stock). */
export async function adminRetryDelivery(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = getId(fd);
  if (!id) return;
  const { error } = await createAdminClient().rpc("allocate_order_codes", { p_order_id: id });
  await writeAudit(user.id, error ? "order.delivery_retry_failed" : "order.delivery_retried", "order", id, null);
  if (!error) queuePaidEmails(id, "paid_allocated");
  revalidatePath(`/admin/orders/${id}`);
}

/** Send the codes email again (forced), for example when a customer says it never arrived. */
export async function adminResendDelivery(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = getId(fd);
  if (!id) return;
  await sendOrderEmail(id, "gift_card_delivery", { force: true });
  await writeAudit(user.id, "email.resent_by_admin", "order", id, { template: "gift_card_delivery" });
  revalidatePath(`/admin/orders/${id}`);
}
