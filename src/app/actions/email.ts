"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { sendOrderEmail } from "@/lib/email/order-email";

const uuid = z.string().uuid();
const MAX_ATTEMPTS = 6;

/** Customer: "email my codes again". Only to their own account email, only for their own completed order. */
export async function resendDeliveryEmail(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const orderId = String(fd.get("orderId") ?? "");
  if (!uuid.safeParse(orderId).success) return;

  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, user_id, status, fulfillment_status").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id || order.status !== "completed" || order.fulfillment_status !== "delivered") return;

  const { data: row } = await db.from("email_deliveries").select("attempts").eq("order_id", orderId).eq("template", "gift_card_delivery").maybeSingle();
  if ((row?.attempts ?? 0) >= MAX_ATTEMPTS) redirect(`/account/orders/${orderId}?email=limit`);

  const r = await sendOrderEmail(orderId, "gift_card_delivery", { force: true });
  redirect(`/account/orders/${orderId}?email=${r.status}`);
}

/** Admin: retry a failed or stuck email from the Emails page. */
export async function adminRetryEmail(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = String(fd.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;
  const db = createAdminClient();
  const { data: d } = await db.from("email_deliveries").select("order_id, template").eq("id", id).maybeSingle();
  if (!d?.order_id) return;
  await sendOrderEmail(d.order_id as string, d.template as string); // not forced: an already-sent email is never re-sent
  await writeAudit(user.id, "email.retried", "email_delivery", id, { template: String(d.template).split(":")[0] });
  revalidatePath("/admin/emails");
}
