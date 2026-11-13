import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Customers" };

const PAGE = 25;
type P = { id: string; full_name: string | null; email: string | null; phone: string | null; role: string; created_at: string };
type O = { user_id: string; total_npr: number; status: string };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[^\w@.+\- ]/g, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const db = createAdminClient();

  let query = db.from("profiles").select("id, full_name, email, phone, role, created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count } = await query;
  const people = (data ?? []) as P[];

  const stats = new Map<string, { orders: number; spent: number }>();
  if (people.length) {
    const { data: orders } = await db.from("orders").select("user_id, total_npr, status").in("user_id", people.map((p) => p.id)).eq("status", "completed");
    for (const o of (orders ?? []) as O[]) {
      const s = stats.get(o.user_id) ?? { orders: 0, spent: 0 };
      stats.set(o.user_id, { orders: s.orders + 1, spent: s.spent + Number(o.total_npr) });
    }
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Customers</h1>
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1"><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Name, email or phone" /></div>
        <button type="submit" className="btn-primary !py-3">Search</button>
      </form>
      {people.length === 0 ? <EmptyState title="No customers found" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">Customer</th><th className="p-4">Completed orders</th><th className="p-4">Spent</th><th className="p-4">Joined</th></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {people.map((p) => {
                const s = stats.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="p-4"><Link href={`/admin/customers/${p.id}`} className="font-semibold text-brand-700 hover:underline">{p.full_name ?? "—"}</Link>{p.role !== "customer" && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">{p.role}</span>}<p className="text-xs text-ink-soft">{p.email}</p></td>
                    <td className="p-4">{s?.orders ?? 0}</td><td className="p-4">{formatNpr(s?.spent ?? 0)}</td>
                    <td className="p-4 text-ink-soft">{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="font-semibold text-brand-700 hover:underline">&larr; Previous</Link> : <span />}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="font-semibold text-brand-700 hover:underline">Next &rarr;</Link> : <span />}
        </div>
      )}
    </div>
  );
}
