import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Audit log" };

const PAGE = 50;
type A = { id: number; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; profiles: { email: string | null } | null };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[^\w.]/g, "").slice(0, 40);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  let query = createAdminClient().from("audit_logs").select("id, action, entity_type, entity_id, details, created_at, profiles(email)", { count: "exact" }).order("id", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike("action", `${q}%`);
  const { data, count } = await query;
  const rows = (data ?? []) as unknown as A[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Audit log</h1>
      <p className="text-sm text-ink-soft">A permanent, read-only record of important actions. Entries cannot be edited or deleted.</p>
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1"><label className="label" htmlFor="q">Action starts with</label><input id="q" name="q" defaultValue={q} className="input" placeholder="e.g. product, payment, inventory, admin.login" /></div>
        <button type="submit" className="btn-primary !py-3">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No entries" /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">When</th><th className="p-4">Who</th><th className="p-4">Action</th><th className="p-4">Record</th><th className="p-4">Details</th></tr></thead>
          <tbody className="divide-y divide-ink/10">{rows.map((a) => (
            <tr key={a.id} className="align-top">
              <td className="whitespace-nowrap p-4 text-ink-soft">{new Date(a.created_at).toLocaleString("en-GB")}</td>
              <td className="p-4">{a.profiles?.email ?? <span className="text-ink-muted">system</span>}</td>
              <td className="p-4 font-medium">{a.action}</td>
              <td className="p-4 text-xs text-ink-soft">{a.entity_type}{a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}</td>
              <td className="max-w-xs break-words p-4 text-xs text-ink-soft">{a.details ? JSON.stringify(a.details) : "—"}</td>
            </tr>))}</tbody></table></div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="font-semibold text-brand-700 hover:underline">&larr; Newer</Link> : <span />}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="font-semibold text-brand-700 hover:underline">Older &rarr;</Link> : <span />}
        </div>
      )}
    </div>
  );
}
