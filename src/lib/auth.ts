import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "customer" | "staff" | "admin";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // validates the JWT with Supabase
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  return profile ? { user, profile } : null;
}

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

/** Call at the top of every admin page and server action. */
export async function requireRole(...roles: Role[]) {
  const current = await requireUser();
  if (!roles.includes(current.profile.role as Role)) redirect("/");
  return current;
}

/** For route handlers: returns null instead of redirecting. */
export async function getAdminOrNull() {
  const current = await getCurrentUser();
  return current && current.profile.role === "admin" ? current : null;
}

/** Lightweight lookup for the site header. Never throws. */
export async function getHeaderUser(): Promise<{ name: string; role: Role; cartCount: number } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // validates the JWT with Supabase
    if (!user) return null;
    const [profileRes, cartRes] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
      supabase.from("cart_items").select("quantity"), // RLS: own cart only
    ]);
    if (!profileRes.data) return null;
    const cartCount = ((cartRes.data ?? []) as { quantity: number }[]).reduce((n, r) => n + r.quantity, 0);
    return { name: profileRes.data.full_name ?? "Account", role: profileRes.data.role as Role, cartCount };
  } catch {
    return null;
  }
}
