"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { writeAudit } from "@/lib/audit";
import { limited, TOO_MANY } from "@/lib/rate-limit";
import {
  emptyAuthState, forgotSchema, loginSchema, registerSchema, resetSchema, toFieldErrors, type AuthState,
} from "@/lib/validation/auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const SITE = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const raw = { fullName: str(fd, "fullName"), phone: str(fd, "phone"), email: str(fd, "email"), password: str(fd, "password"), confirmPassword: str(fd, "confirmPassword") };
  const values = { fullName: raw.fullName, phone: raw.phone, email: raw.email };
  if (await limited("signup", 5, 3600)) return { ...emptyAuthState, message: TOO_MANY, values };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ...emptyAuthState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone }, // role is NEVER taken from here
      emailRedirectTo: `${SITE}/auth/callback`,
    },
  });
  if (error) {
    const msg = error.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : "We couldn't create your account. Please check your details and try again.";
    return { ...emptyAuthState, message: msg, values };
  }
  // Same message whether or not the email already exists (avoids account enumeration).
  return { ...emptyAuthState, ok: true, message: "Almost done! If this email can be registered, we've sent a verification link. Open it to activate your account." };
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  if ((await limited("login", 20, 600)) || (await limited("login-email", 8, 600, values.email.trim().toLowerCase()))) return { ...emptyAuthState, message: TOO_MANY, values };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { ...emptyAuthState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues), values };

  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ...emptyAuthState, needsVerification: true, message: "Please verify your email address first. Check your inbox for the verification link.", values };
    }
    return { ...emptyAuthState, message: "Incorrect email or password.", values };
  }
  if (signedIn.user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", signedIn.user.id).maybeSingle();
    if (prof?.role === "admin") await writeAudit(signedIn.user.id, "admin.login", "profile", signedIn.user.id, null);
  }
  redirect(safeNext(fd.get("next")));
}

export async function resendVerification(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (await limited("resend-verify", 5, 3600)) return { ...emptyAuthState, message: TOO_MANY };
  const parsed = forgotSchema.safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { ...emptyAuthState, message: "Enter your email address first.", errors: toFieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${SITE}/auth/callback` } });
  return { ...emptyAuthState, ok: true, message: "If that account needs verification, we've sent a new link." };
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  if (await limited("password-reset", 5, 3600)) return { ...emptyAuthState, message: TOO_MANY, values };
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { ...emptyAuthState, message: "Enter a valid email address.", errors: toFieldErrors(parsed.error.issues), values };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${SITE}/auth/reset` });
  return { ...emptyAuthState, ok: true, message: "If an account exists for that email, we've sent a link to reset your password." };
}

export async function resetPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({ password: str(fd, "password"), confirmPassword: str(fd, "confirmPassword") });
  if (!parsed.success) return { ...emptyAuthState, message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...emptyAuthState, message: "Your reset link has expired. Please request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ...emptyAuthState, message: "We couldn't update your password. Please try again or request a new link." };
  await supabase.auth.signOut({ scope: "others" }); // revoke every other session
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
