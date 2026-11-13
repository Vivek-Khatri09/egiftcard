import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import { isDateStr, nepalToday } from "@/lib/admin-dates";
import SalesChart, { profitOf, type SeriesPoint } from "@/components/admin/SalesChart";

export const metadata = { title: "Dashboard" };

type Report = {
  totals: { revenue: number; product_cost: number; payment_fees: number; expenses: number; discounts: number; orders: number };
  series: SeriesPoint[];
  by_product: { name: string; qty: number; revenue: number; cost: number }[];
  by_method: { method: string; orders: number; revenue: number }[];
};
type Stock = { product_id: string; available: number; sold: number };
const METHOD: Record<string, string> = { esewa: "eSewa", khalti: "Khalti", bank_transfer: "Bank transfer" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; group?: string }> }) {
  const sp = await searchParams;
  const to = isDateStr(sp.to) ? sp.to : nepalToday();
  const from = isDateStr(sp.from) ? sp.from : nepalToday(-29);
  const group = sp.group === "week" || sp.group === "month" ? sp.group : "day";

  const db = createAdminClient();
  const [rep, stock, customers, products, pending, completed] = await Promise.all([
    db.rpc("admin_sales_report", { p_from: from, p_to: to, p_group: group }),
    db.rpc("admin_stock_counts"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    db.from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_payment", "payment_verification"]),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);
  const report = rep.data as Report | null;
  const t = report?.totals;
  const profit = t ? t.revenue - t.product_cost - t.payment_fees - t.expenses : 0;
  const codes = ((stock.data ?? []) as Stock[]).reduce((n, s) => ({ available: n.available + s.available, sold: n.sold + s.sold }), { available: 0, sold: 0 });

  const cards = [
    { label: "Revenue", value: formatNpr(t?.revenue ?? 0), sub: `${t?.orders ?? 0} paid orders` },
    { label: "Profit", value: formatNpr(profit), sub: "after costs, fees, expenses" },
    { label: "Total orders", value: String((completed.count ?? 0) + (pending.count ?? 0)), sub: `${completed.count ?? 0} completed` },
    { label: "Pending payments", value: String(pending.count ?? 0), sub: "awaiting payment or review" },
    { label: "Customers", value: String(customers.count ?? 0), sub: "registered" },
    { label: "Products", value: String(products.count ?? 0), sub: "not archived" },
    { label: "Available codes", value: String(codes.available), sub: "in stock" },
    { label: "Sold codes", value: String(codes.sold), sub: "all time" },
  ];

  const rows = t ? [
    ["Revenue (after discounts)", t.revenue], ["Product cost", -t.product_cost], ["Payment fees", -t.payment_fees], ["Expenses", -t.expenses], ["Profit", profit],
  ] as [string, number][] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Sales figures cover the chosen dates (Nepal time). Counts for customers, products and codes are all-time.</p>
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={from} className="input" /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={to} className="input" /></div>
        <div>
          <label className="label" htmlFor="group">Group by</label>
          <select id="group" name="group" defaultValue={group} className="input"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
        </div>
        <button type="submit" className="btn-primary !py-3">Apply</button>
        <Link href="/admin" className="pb-3 text-sm font-semibold text-brand-700 hover:underline">Last 30 days</Link>
      </form>

      {rep.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">Couldn&apos;t load the sales report ({rep.error.message.includes("range") ? "choose a shorter date range, 3 years at most" : "has migration 0011 been run?"}).</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5"><p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{c.label}</p><p className="mt-1 text-2xl font-bold">{c.value}</p><p className="text-xs text-ink-soft">{c.sub}</p></div>
        ))}
      </div>

      {report && (
        <>
          <section className="card p-6" aria-labelledby="chart">
            <h2 id="chart" className="mb-4 font-semibold">Sales by {group}</h2>
            <SalesChart series={report.series} />
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold text-brand-700">Show as table</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="text-xs uppercase tracking-wider text-ink-muted"><tr><th className="py-2">Period</th><th>Orders</th><th>Revenue</th><th>Profit</th></tr></thead>
                  <tbody className="divide-y divide-ink/10">{report.series.map((p) => <tr key={p.bucket}><td className="py-1.5">{p.bucket}</td><td>{p.orders}</td><td>{formatNpr(p.revenue)}</td><td>{formatNpr(profitOf(p))}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6" aria-labelledby="pl">
              <h2 id="pl" className="mb-3 font-semibold">Profit breakdown</h2>
              <dl className="space-y-2 text-sm">
                {rows.map(([label, v], i) => (
                  <div key={label} className={`flex justify-between ${i === rows.length - 1 ? "border-t border-ink/10 pt-2 text-base font-bold" : ""}`}><dt className="text-ink-soft">{label}</dt><dd>{v < 0 ? "- " : ""}{formatNpr(Math.abs(v))}</dd></div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-ink-muted">Product cost is the acquisition cost of codes actually sold. Payment fees use the percentages in Settings. Discounts given: {formatNpr(t?.discounts ?? 0)}.</p>
            </section>
            <section className="card p-6" aria-labelledby="pm">
              <h2 id="pm" className="mb-3 font-semibold">Payment methods</h2>
              {report.by_method.length === 0 ? <p className="text-sm text-ink-soft">No paid orders in this range.</p> : (
                <ul className="divide-y divide-ink/10 text-sm">{report.by_method.map((m) => <li key={m.method} className="flex justify-between py-2"><span>{METHOD[m.method] ?? m.method} · {m.orders} orders</span><span className="font-semibold">{formatNpr(m.revenue)}</span></li>)}</ul>
              )}
            </section>
          </div>

          <section className="card p-6" aria-labelledby="best">
            <h2 id="best" className="mb-3 font-semibold">Bestselling products</h2>
            {report.by_product.length === 0 ? <p className="text-sm text-ink-soft">No sales in this range.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-muted"><tr><th className="py-2">Product</th><th>Sold</th><th>Revenue</th><th>Cost</th></tr></thead>
                <tbody className="divide-y divide-ink/10">{report.by_product.map((p) => <tr key={p.name}><td className="py-2">{p.name}</td><td>{p.qty}</td><td>{formatNpr(p.revenue)}</td><td>{formatNpr(p.cost)}</td></tr>)}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
