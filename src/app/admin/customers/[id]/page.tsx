import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import StatusPill from "@/components/account/StatusPill";

export const metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = createAdminClient();
  const [{ data: p }, { data: orders }, auth] = await Promise.all([
    db.from("profiles").select("id, full_name, email, phone, role, created_at").eq("id", id).maybeSingle(),
    db.from("orders").select("id, order_number, status, total_npr, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    db.auth.admin.getUserById(id), // read-only: sign-in activity. Passwords and secrets are never exposed.
  ]);
  if (!p) notFound();
  const list = (orders ?? []) as { id: string; order_number: string; status: string; total_npr: number; created_at: string }[];
  const spent = list.filter((o) => o.status === "completed").reduce((n, o) => n + Number(o.total_npr), 0);
  const lastSignIn = auth.data?.user?.last_sign_in_at;

  const rows: [string, string][] = [
    ["Name", p.full_name ?? "—"], ["Email", p.email ?? "—"], ["Phone", p.phone ?? "—"], ["Role", p.role],
    ["Joined", new Date(p.created_at).toLocaleDateString("en-GB")],
    ["Last sign-in", lastSignIn ? new Date(lastSignIn).toLocaleString("en-GB") : "never"],
    ["Email verified", auth.data?.user?.email_confirmed_at ? "yes" : "no"],
    ["Total spent (completed orders)", formatNpr(spent)],
  ];

  return (
    <div className="space-y-6">
      <div><Link href="/admin/customers" className="text-sm font-semibold text-brand-700 hover:underline">&larr; Customers</Link><h1 className="mt-2 font-display text-3xl font-bold">{p.full_name ?? p.email}</h1></div>
      <section className="card p-6"><dl className="grid gap-4 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{k}</dt><dd className="mt-0.5 break-words">{v}</dd></div>)}</dl></section>
      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Orders</h2>
        {list.length === 0 ? <p className="text-sm text-ink-soft">No orders.</p> : (
          <ul className="divide-y divide-ink/10 text-sm">
            {list.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.order_number}</Link><span className="text-ink-soft">{new Date(o.created_at).toLocaleDateString("en-GB")}</span><span>{formatNpr(Number(o.total_npr))}</span><StatusPill status={o.status} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
