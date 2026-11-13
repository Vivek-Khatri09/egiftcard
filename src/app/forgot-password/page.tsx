import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "@/components/auth/ForgotForm";

export const metadata = { title: "Forgot password" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={<Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link>}
    >
      {error === "link_expired" && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">That reset link is invalid or has expired. Request a new one below.</p>
      )}
      <ForgotForm />
    </AuthShell>
  );
}
