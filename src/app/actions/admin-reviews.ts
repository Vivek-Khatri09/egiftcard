"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";

export async function moderateReview(fd: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = String(fd.get("id") ?? "");
  const action = String(fd.get("decision") ?? "");
  if (!z.string().uuid().safeParse(id).success || !["approve", "hide", "delete"].includes(action)) return;
  const db = createAdminClient();
  const { error } = action === "delete"
    ? await db.from("reviews").delete().eq("id", id)
    : await db.from("reviews").update({ is_approved: action === "approve" }).eq("id", id);
  if (!error) await writeAudit(user.id, `review.${action}`, "review", id, null);
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
}
