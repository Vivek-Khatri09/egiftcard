"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { categorySchema } from "@/lib/validation/product";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function saveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const values = { name: str(fd, "name"), sortOrder: str(fd, "sortOrder") || "0" };
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };

  const admin = createAdminClient();
  const id = str(fd, "id");
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return { ...emptyFormState, message: "Invalid category.", values };
    const { error } = await admin.from("categories").update({ name: parsed.data.name, sort_order: parsed.data.sortOrder }).eq("id", id);
    if (error) return { ...emptyFormState, message: error.code === "23505" ? "A category with that name already exists." : "Could not save the category.", values };
    await writeAudit(user.id, "category.updated", "category", id, { name: parsed.data.name });
  } else {
    const { data, error } = await admin
      .from("categories")
      .insert({ name: parsed.data.name, slug: slugify(parsed.data.name), sort_order: parsed.data.sortOrder })
      .select("id")
      .single();
    if (error || !data) return { ...emptyFormState, message: error?.code === "23505" ? "A category with that name already exists." : "Could not save the category.", values };
    await writeAudit(user.id, "category.created", "category", data.id, { name: parsed.data.name });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  return { ...emptyFormState, ok: true, message: "Category saved.", values: id ? values : { name: "", sortOrder: "0" } };
}

export async function toggleCategory(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(fd, "id");
  if (!z.string().uuid().safeParse(id).success) return;
  const activate = str(fd, "activate") === "1";
  const { error } = await createAdminClient().from("categories").update({ is_active: activate }).eq("id", id);
  if (!error) await writeAudit(user.id, activate ? "category.activated" : "category.deactivated", "category", id, null);
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
}
