import Link from "next/link";
import { redirect } from "next/navigation";
import { getHeaderUser } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getHeaderUser()) redirect("/account");
  return (
    <AuthShell
      title="Create your account"
      subtitle="An account is required to purchase. Browsing is open to everyone."
      footer={<>Already registered? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  );
}
