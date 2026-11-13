import Link from "next/link";
import { redirect } from "next/navigation";
import { getHeaderUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Log in" };

const NOTICES: Record<string, string> = {
  verification_failed: "That verification link is invalid or expired, or was opened in a different browser. If you already verified your email, just log in.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  if (await getHeaderUser()) redirect(target);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to buy gift cards and view your orders."
      footer={<>New here? <Link href="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      {error && NOTICES[error] && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{NOTICES[error]}</p>}
      <LoginForm next={target} />
    </AuthShell>
  );
}
