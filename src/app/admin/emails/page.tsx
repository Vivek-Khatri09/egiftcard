import { createAdminClient } from "@/lib/supabase/admin";
import { adminRetryEmail } from "@/app/actions/email";
import { emailConfigured } from "@/lib/email/send";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Emails" };

type Row = {
  id: string; template: string; status: string; attempts: number; last_error: string | null; last_attempt_at: string | null; created_at: string;
  orders: { order_number: string; profiles: { email: string | null } | null } | null;
};

export default async function AdminEmails() {
  const { data } = await createAdminClient()
    .from("email_deliveries")
    .select("id, template, status, attempts, last_error, last_attempt_at, created_at, orders(order_number, profiles(email))")
    .neq("status", "sent").order("created_at", { ascending: false }).limit(50);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Emails</h1>
      {!emailConfigured() && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Email sending is not configured. Add the SMTP settings to .env.local (see docs/EMAIL_SETUP.md). Customers still see their codes in their account.</p>
      )}
      <p className="text-sm text-ink-soft">Emails that failed or are still pending. Gift card codes are never lost when an email fails: they stay in the customer&apos;s account, and you can retry safely here.</p>
      {rows.length === 0 ? <EmptyState title="No failed emails" text="Every email has been delivered." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">Order</th><th className="p-4">Email</th><th className="p-4">To</th><th className="p-4">Status</th><th className="p-4">Error</th><th className="p-4" /></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-4 font-medium">{r.orders?.order_number}</td>
                  <td className="p-4">{(r.template.split(":")[0] ?? "").replace(/_/g, " ")}</td>
                  <td className="p-4 text-ink-soft">{r.orders?.profiles?.email ?? "—"}</td>
                  <td className={`p-4 ${r.status === "failed" ? "text-rose-700" : "text-amber-700"}`}>{r.status} ({r.attempts})</td>
                  <td className="max-w-xs p-4 text-xs text-ink-soft">{r.last_error ?? "—"}</td>
                  <td className="p-4"><form action={adminRetryEmail}><input type="hidden" name="id" value={r.id} /><button type="submit" className="font-semibold text-brand-700 hover:underline">Retry</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
