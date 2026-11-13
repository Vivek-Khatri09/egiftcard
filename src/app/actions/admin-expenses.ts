"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const schema = z.object({
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  category: z.enum(["marketing", "software", "fees", "salary", "other"]),
  description: z.string().trim().min(2, "Describe the expense").max(200, "Too long"),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).gt(0, "Must be more than 0").max(100_000_000),
});

export async function addExpense(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const values = { spentOn: String(fd.get("spentOn") ?? ""), category: String(fd.get("category") ?? ""), description: String(fd.get("description") ?? ""), amount: String(fd.get("amount") ?? "") };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };
  const d = parsed.data;
  const { data, error } = await createAdminClient().from("expenses")
    .insert({ spent_on: d.spentOn, category: d.category, description: d.description, amount_npr: Math.round(d.amount * 100) / 100, created_by: user.id }).select("id").single();
  if (error || !data) return { ...emptyFormState, message: "Could not save the expense.", values };
  await writeAudit(user.id, "expense.added", "expense", data.id, { amount_npr: d.amount, category: d.category });
  revalidatePath("/admin/expenses");
  return { ...emptyFormState, ok: true, message: "Expense added.", values: {} };
}

export async function deleteExpense(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = String(fd.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const db = createAdminClient();
  const { data: old } = await db.from("expenses").select("amount_npr, category, description").eq("id", id).maybeSingle();
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (!error) await writeAudit(user.id, "expense.deleted", "expense", id, old ?? null); // the audit log keeps what was removed
  revalidatePath("/admin/expenses");
}
