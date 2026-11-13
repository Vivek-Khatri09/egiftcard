import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/orders";
import StatusPill from "@/components/account/StatusPill";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Orders" };

const PAGE = 25;
const STATUSES = ["pending_payment", "payment_verification", "processing", "completed", "failed", "cancelled"];
type Row = { id: string; order_number: string; status: string; payment_method: string; total_npr: number; created_at: string; needs_attention: boolean; profiles: { full_name: string | null; email: string | null } | null };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; method?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[^\w@.+\- ]/g, "").trim().slice(0, 60);
  const status = STATUSES.includes(sp.status ?? "") ? sp.status! : "";
  const method = ["esewa", "khalti", "bank_transfer"].includes(sp.method ?? "") ? sp.method! : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const db = createAdminClient();
  let query = db.from("orders")
    .select("id, order_number, status, payment_method, total_npr, created_at, needs_attention, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (method) query = query.eq("payment_method", method);
  if (q) {
    const { data: people } = await db.from("profiles").select("id").or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(50);
    const ids = ((people ?? []) as { id: string }[]).map((p) => p.id);
    query = query.or(ids.length ? `order_number.ilike.%${q}%,user_id.in.(${ids.join(",")})` : `order_number.ilike.%${q}%`);
  }
  const { data, count } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    params.set("page", String(p));
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Orders</h1>
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1"><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Order number, customer name or email" /></div>
        <div><label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status} className="input"><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
        <div><label className="label" htmlFor="method">Payment</label>
          <select id="method" name="method" defaultValue={method} className="input"><option value="">All</option>{Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button type="submit" className="btn-primary !py-3">Filter</button>
      </form>

      {rows.length === 0 ? <EmptyState title="No orders found" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Total</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4">Date</th></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="p-4"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.order_number}</Link>{o.needs_attention && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Needs attention</span>}</td>
                  <td className="p-4"><p>{o.profiles?.full_name ?? "—"}</p><p className="text-xs text-ink-soft">{o.profiles?.email}</p></td>
                  <td className="p-4">{formatNpr(Number(o.total_npr))}</td>
                  <td className="p-4">{PAYMENT_METHOD_LABEL[o.payment_method]}</td>
                  <td className="p-4"><StatusPill status={o.status} /></td>
                  <td className="p-4 text-ink-soft">{new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="font-semibold text-brand-700 hover:underline">&larr; Previous</Link> : <span />}
          <span className="text-ink-soft">Page {page} of {pages} · {count} orders</span>
          {page < pages ? <Link href={link(page + 1)} className="font-semibold text-brand-700 hover:underline">Next &rarr;</Link> : <span />}
        </div>
      )}
    </div>
  );
}
