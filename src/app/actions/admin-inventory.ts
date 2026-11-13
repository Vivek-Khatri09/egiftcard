"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { hashCode, validateCode } from "@/lib/code-utils";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function addSingleCode(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const productId = str(fd, "productId");
  const code = str(fd, "code").trim();
  const pin = str(fd, "pin").trim();

  if (!z.string().uuid().safeParse(productId).success) return { ...emptyFormState, message: "Invalid product." };
  const problem = validateCode(code);
  if (problem) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: { code: problem } };
  if (pin.length > 64) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: { pin: "PIN is too long" }, values: { code } };

  const admin = createAdminClient();
  const { data: product } = await admin.from("products").select("id, purchase_cost_npr").eq("id", productId).maybeSingle();
  if (!product) return { ...emptyFormState, message: "Product not found." };

  const { data, error } = await admin
    .from("gift_card_codes")
    .insert({ product_id: productId, code, pin: pin || null, code_hash: hashCode(code), cost_npr: product.purchase_cost_npr, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ...emptyFormState, message: "That code already exists in your inventory.", errors: { code: "Duplicate code" } };
    return { ...emptyFormState, message: "We couldn't save the code. Please try again." };
  }
  await admin.from("inventory_events").insert({ product_id: productId, code_id: data.id, event_type: "added", quantity: 1, actor_id: user.id, note: "manual entry" });
  await writeAudit(user.id, "inventory.code_added", "product", productId, { count: 1, method: "manual" });
  revalidatePath(`/admin/inventory/${productId}`);
  revalidatePath("/", "layout");
  return { ...emptyFormState, ok: true, message: "Code added." };
}

export async function voidCode(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(fd, "id");
  if (!z.string().uuid().safeParse(id).success) return;
  const admin = createAdminClient();
  // Only unsold codes can be voided; the status check keeps sold codes untouched.
  const { data } = await admin.from("gift_card_codes").update({ status: "void" }).eq("id", id).eq("status", "available").select("id, product_id").maybeSingle();
  if (!data) return;
  await admin.from("inventory_events").insert({ product_id: data.product_id, code_id: data.id, event_type: "voided", quantity: 1, actor_id: user.id, note: "voided by admin" });
  await writeAudit(user.id, "inventory.code_voided", "product", data.product_id, { code_id: data.id });
  revalidatePath(`/admin/inventory/${data.product_id}`);
  revalidatePath("/", "layout");
}
