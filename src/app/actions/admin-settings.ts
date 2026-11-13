"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { toFieldErrors } from "@/lib/validation/auth";
import { emptyFormState, type FormState } from "@/lib/validation/form";

const txt = (max: number, label: string) => z.string().trim().min(1, `Enter ${label}`).max(max, "Too long");
const pct = z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative").max(10, "That looks too high (max 10%)");

const SECTIONS = {
  contact: z.object({ address: txt(300, "an address"), email: z.string().trim().email("Enter a valid email").max(254), phone: txt(30, "a phone number") }),
  bank_account: z.object({ bank_name: txt(100, "the bank name"), account_name: txt(100, "the account name"), account_number: txt(60, "the account number"), branch: txt(100, "the branch") }),
  fees: z.object({ esewa_percent: pct, khalti_percent: pct, bank_transfer_percent: pct }),
  checkout: z.object({
    online_reservation_minutes: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole number").min(5, "At least 5").max(1440, "At most 1440"),
    bank_transfer_reservation_hours: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole number").min(1, "At least 1").max(168, "At most 168"),
  }),
} as const;

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole("admin");
  const section = String(fd.get("section") ?? "") as keyof typeof SECTIONS;
  const schema = SECTIONS[section];
  if (!schema) return { ...emptyFormState, message: "Unknown settings section." };

  const values: Record<string, string> = {};
  for (const k of Object.keys(schema.shape)) values[k] = String(fd.get(k) ?? "");
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ...emptyFormState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };

  const { error } = await createAdminClient().from("site_settings").upsert({ key: section, value: parsed.data, updated_at: new Date().toISOString() });
  if (error) return { ...emptyFormState, message: "Could not save. Please try again.", values };
  await writeAudit(user.id, "settings.updated", "settings", section, { fields: Object.keys(values) }); // values are not logged (bank details)
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ...emptyFormState, ok: true, message: "Saved.", values };
}
