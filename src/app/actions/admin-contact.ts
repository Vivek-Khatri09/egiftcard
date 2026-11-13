"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";

export async function setSubmissionStatus(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!z.string().uuid().safeParse(id).success || !["new", "in_progress", "resolved", "spam"].includes(status)) return;
  const { error } = await createAdminClient().from("contact_submissions").update({ status }).eq("id", id);
  if (!error) await writeAudit(user.id, "contact.status_changed", "contact_submission", id, { status });
  revalidatePath("/admin/contact");
}
