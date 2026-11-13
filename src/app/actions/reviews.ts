"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { limited, TOO_MANY } from "@/lib/rate-limit";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const schema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  body: z.string().trim().min(5, "Please write at least 5 characters").max(1000, "Too long (1000 characters max)"),
});

/** Verified-purchase review. The database also enforces: own completed order only, starts unapproved, one per product per order. */
export async function submitReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireUser();
  const values = { orderId: String(fd.get("orderId") ?? ""), productId: String(fd.get("productId") ?? ""), rating: String(fd.get("rating") ?? ""), body: String(fd.get("body") ?? "") };
  if (await limited("review", 20, 86400, user.id)) return { ...emptyFormState, message: TOO_MANY, values };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: item } = await supabase.from("order_items").select("id").eq("order_id", d.orderId).eq("product_id", d.productId).maybeSingle(); // RLS: own orders only
  if (!item) return { ...emptyFormState, message: "You can only review items you have purchased.", values };

  const { error } = await supabase.from("reviews").insert({ user_id: user.id, order_id: d.orderId, product_id: d.productId, rating: d.rating, body: d.body });
  if (error) {
    return { ...emptyFormState, message: error.code === "23505" ? "You've already reviewed this item." : "We couldn't save your review. Only completed orders can be reviewed.", values };
  }
  revalidatePath(`/account/orders/${d.orderId}`);
  return { ...emptyFormState, ok: true, message: "Thank you! Your review will appear after our team approves it.", values: {} };
}
