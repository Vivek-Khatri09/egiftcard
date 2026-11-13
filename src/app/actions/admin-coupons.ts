"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { couponSchema } from "@/lib/validation/coupon";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const FIELDS = ["code", "discountType", "discountValue", "maxDiscount", "minPurchase", "usageLimit", "expiresAt"];

export async function saveCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const values: Record<string, string> = {};
  for (const k of FIELDS) values[k] = str(fd, k);
  values.isActive = fd.get("isActive") === "on" ? "on" : "";

  const parsed = couponSchema.safeParse(values);
  if (!parsed.success) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };
  const d = parsed.data;
  if (d.discountType === "percentage" && d.discountValue > 100) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: { discountValue: "A percentage cannot exceed 100" }, values };

  const row = {
    code: d.code,
    discount_type: d.discountType,
    discount_value: d.discountValue,
    max_discount_npr: d.maxDiscount === "" ? null : Number(d.maxDiscount),
    min_purchase_npr: d.minPurchase === "" ? 0 : Number(d.minPurchase),
    usage_limit: d.usageLimit === "" ? null : Number(d.usageLimit),
    // The date picker has no timezone: it is read as Nepal time (UTC+05:45).
    expires_at: d.expiresAt === "" ? null : new Date(`${d.expiresAt}:00+05:45`).toISOString(),
    is_active: values.isActive === "on",
  };

  const admin = createAdminClient();
  const id = str(fd, "id");
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return { ...emptyFormState, message: "Invalid coupon.", values };
    const { error } = await admin.from("coupons").update(row).eq("id", id);
    if (error) return { ...emptyFormState, message: error.code === "23505" ? "That code already exists." : "Could not save the coupon.", values };
    await writeAudit(user.id, "coupon.updated", "coupon", id, { code: row.code, is_active: row.is_active });
  } else {
    const { data, error } = await admin.from("coupons").insert(row).select("id").single();
    if (error || !data) return { ...emptyFormState, message: error?.code === "23505" ? "That code already exists." : "Could not save the coupon.", values };
    await writeAudit(user.id, "coupon.created", "coupon", data.id, { code: row.code });
  }
  revalidatePath("/admin/coupons");
  return { ...emptyFormState, ok: true, message: "Coupon saved.", values: id ? values : {} };
}

export async function toggleCoupon(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(fd, "id");
  if (!z.string().uuid().safeParse(id).success) return;
  const activate = str(fd, "activate") === "1";
  const { error } = await createAdminClient().from("coupons").update({ is_active: activate }).eq("id", id);
  if (!error) await writeAudit(user.id, activate ? "coupon.enabled" : "coupon.disabled", "coupon", id, null);
  revalidatePath("/admin/coupons");
}
