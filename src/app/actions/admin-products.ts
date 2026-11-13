"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { productSchema } from "@/lib/validation/product";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const round2 = (n: number) => Math.round(n * 100) / 100;
const TEXT_FIELDS = ["brand", "name", "categoryId", "description", "denominationLabel", "denominationValue", "denominationCurrency", "sellingPrice", "purchaseCost", "lowStockThreshold", "imagePath"];

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");

  const values: Record<string, string> = {};
  for (const k of TEXT_FIELDS) values[k] = str(fd, k);
  values.isActive = fd.get("isActive") === "on" ? "on" : "";
  values.isFeatured = fd.get("isFeatured") === "on" ? "on" : "";

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };
  }
  const d = parsed.data;
  const row = {
    category_id: d.categoryId || null,
    brand: d.brand,
    name: d.name,
    description: d.description || null,
    denomination_label: d.denominationLabel,
    denomination_value: d.denominationValue === "" ? null : Number(d.denominationValue),
    denomination_currency: d.denominationCurrency || null,
    selling_price_npr: round2(d.sellingPrice),
    purchase_cost_npr: round2(d.purchaseCost),
    low_stock_threshold: d.lowStockThreshold,
    image_path: d.imagePath || null,
    is_active: values.isActive === "on",
    is_featured: values.isFeatured === "on",
  };

  const admin = createAdminClient();
  const id = str(fd, "id");

  if (!id) {
    const base = slugify(d.name);
    let slug = base;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await admin.from("products").insert({ ...row, slug }).select("id").single();
      if (!error && data) {
        await writeAudit(user.id, "product.created", "product", data.id, { name: d.name, selling_price_npr: row.selling_price_npr, purchase_cost_npr: row.purchase_cost_npr });
        revalidatePath("/", "layout");
        redirect(`/admin/products/${data.id}?created=1`);
      }
      if (error?.code !== "23505") break; // not a duplicate-slug problem
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return { ...emptyFormState, message: "We couldn't save the product. Please try again.", values };
  }

  if (!z.string().uuid().safeParse(id).success) return { ...emptyFormState, message: "Invalid product.", values };
  const { data: old } = await admin.from("products").select("selling_price_npr, purchase_cost_npr").eq("id", id).maybeSingle();
  if (!old) return { ...emptyFormState, message: "Product not found.", values };

  const { error } = await admin.from("products").update(row).eq("id", id);
  if (error) return { ...emptyFormState, message: "We couldn't save the product. Please try again.", values };

  const oldPrice = Number(old.selling_price_npr);
  const oldCost = Number(old.purchase_cost_npr);
  if (oldPrice !== row.selling_price_npr || oldCost !== row.purchase_cost_npr) {
    await writeAudit(user.id, "product.price_changed", "product", id, {
      selling_price_npr: { from: oldPrice, to: row.selling_price_npr },
      purchase_cost_npr: { from: oldCost, to: row.purchase_cost_npr },
    });
  }
  await writeAudit(user.id, "product.updated", "product", id, null);
  revalidatePath("/", "layout");
  revalidatePath("/admin/products");
  return { ...emptyFormState, ok: true, message: "Product saved.", values };
}

export async function setProductArchived(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(fd, "id");
  if (!z.string().uuid().safeParse(id).success) return;
  const archive = str(fd, "archive") === "1";
  const { error } = await createAdminClient()
    .from("products")
    .update(archive ? { is_archived: true, is_active: false } : { is_archived: false })
    .eq("id", id);
  if (!error) await writeAudit(user.id, archive ? "product.archived" : "product.restored", "product", id, null);
  revalidatePath("/", "layout");
  revalidatePath("/admin/products");
}
