import { redirect } from "next/navigation";
import { getHeaderUser } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "@/components/auth/ResetForm";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage() {
  // Only reachable with a session created by the emailed reset link.
  if (!(await getHeaderUser())) redirect("/forgot-password?error=link_expired");
  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out on your other devices.">
      <ResetForm />
    </AuthShell>
  );
}
