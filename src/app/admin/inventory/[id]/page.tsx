import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { voidCode } from "@/app/actions/admin-inventory";
import { formatNpr } from "@/lib/format";
import AddCodeForm from "@/components/admin/AddCodeForm";
import CodeImportForm from "@/components/admin/CodeImportForm";
import CodeReveal from "@/components/account/CodeReveal";

export const metadata = { title: "Manage codes" };

const PAGE = 50;
const STATUSES = ["available", "sold", "void"] as const;
type Status = (typeof STATUSES)[number];
type CodeRow = { id: string; code: string; pin: string | null; status: string; cost_npr: number; created_at: string; sold_at: string | null };
type EventRow = { id: number; event_type: string; quantity: number; note: string | null; created_at: string };

export default async function ProductInventory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; page?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const status: Status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as Status) : "available";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const db = createAdminClient();
  const { data: product } = await db.from("products").select("id, name, brand, denomination_label, purchase_cost_npr").eq("id", id).maybeSingle();
  if (!product) notFound();

  const [{ data: stock }, codesRes, { data: events }] = await Promise.all([
    db.rpc("admin_stock_counts"),
    db.from("gift_card_codes").select("id, code, pin, status, cost_npr, created_at, sold_at", { count: "exact" }).eq("product_id", id).eq("status", status).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    db.from("inventory_events").select("id, event_type, quantity, note, created_at").eq("product_id", id).order("created_at", { ascending: false }).limit(15),
  ]);
  const counts = ((stock ?? []) as { product_id: string; available: number; sold: number; voided: number }[]).find((s) => s.product_id === id);
  const codes = (codesRes.data ?? []) as CodeRow[];
  const total = codesRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const history = (events ?? []) as EventRow[];

  const stats = [
    { label: "Available", value: counts?.available ?? 0 },
    { label: "Sold", value: counts?.sold ?? 0 },
    { label: "Voided", value: counts?.voided ?? 0 },
  ];
  const qs = (s: string, p: number) => `/admin/inventory/${id}?status=${s}&page=${p}`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/inventory" className="text-sm font-semibold text-brand-700 hover:underline">&larr; Inventory</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{product.name}</h1>
        <p className="text-sm text-ink-soft">{product.brand} · {product.denomination_label} · new codes are recorded at a cost of {formatNpr(Number(product.purchase_cost_npr))} each</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5"><p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{s.label}</p><p className="mt-1 text-3xl font-bold">{s.value}</p></div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AddCodeForm productId={id} />
        <CodeImportForm productId={id} />
      </div>

      <section className="space-y-4" aria-labelledby="codes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="codes" className="font-semibold">Codes</h2>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Link key={s} href={qs(s, 1)} aria-current={s === status ? "true" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${s === status ? "bg-ink text-white" : "bg-white text-ink-soft hover:text-brand-700"}`}>{s}</Link>
            ))}
          </div>
        </div>
        {codes.length === 0 ? (
          <p className="card p-6 text-sm text-ink-soft">No {status} codes.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
                <tr><th className="p-4">Code</th><th className="p-4">Cost</th><th className="p-4">Added</th>{status === "sold" && <th className="p-4">Sold</th>}<th className="p-4" /></tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4"><CodeReveal code={c.code} pin={c.pin} /></td>
                    <td className="p-4">{formatNpr(Number(c.cost_npr))}</td>
                    <td className="p-4 text-ink-soft">{new Date(c.created_at).toLocaleDateString("en-GB")}</td>
                    {status === "sold" && <td className="p-4 text-ink-soft">{c.sold_at ? new Date(c.sold_at).toLocaleDateString("en-GB") : "—"}</td>}
                    <td className="p-4">
                      {c.status === "available" && (
                        <form action={voidCode}><input type="hidden" name="id" value={c.id} /><button type="submit" className="text-ink-soft hover:text-rose-700">Void</button></form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            {page > 1 ? <Link href={qs(status, page - 1)} className="font-semibold text-brand-700 hover:underline">&larr; Previous</Link> : <span />}
            <span className="text-ink-soft">Page {page} of {pages}</span>
            {page < pages ? <Link href={qs(status, page + 1)} className="font-semibold text-brand-700 hover:underline">Next &rarr;</Link> : <span />}
          </div>
        )}
      </section>

      <section className="card p-6" aria-labelledby="history">
        <h2 id="history" className="mb-3 font-semibold">Inventory history</h2>
        {history.length === 0 ? <p className="text-sm text-ink-soft">No changes yet.</p> : (
          <ul className="divide-y divide-ink/10 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="capitalize">{h.event_type} · {h.quantity}{h.note ? ` · ${h.note}` : ""}</span>
                <span className="text-ink-soft">{new Date(h.created_at).toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
