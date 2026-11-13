"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyAuthState, profileSchema, toFieldErrors, type AuthState } from "@/lib/validation/auth";

export async function updateProfile(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { fullName: String(fd.get("fullName") ?? ""), phone: String(fd.get("phone") ?? "") };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ...emptyAuthState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...emptyAuthState, message: "Please log in again.", values };

  // RLS + column grants: users can only change their own full_name and phone, never their role.
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName, phone: parsed.data.phone }).eq("id", user.id);
  if (error) return { ...emptyAuthState, message: "We couldn't save your changes. Please try again.", values };
  revalidatePath("/account", "layout");
  return { ...emptyAuthState, ok: true, message: "Your details have been updated.", values };
}
