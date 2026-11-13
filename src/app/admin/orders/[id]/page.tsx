import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { adminCancelOrder, adminResendDelivery, adminRetryDelivery } from "@/app/actions/admin-orders";
import OrderProgress from "@/components/account/OrderProgress";
import StatusPill from "@/components/account/StatusPill";
import CodeReveal from "@/components/account/CodeReveal";

export const metadata = { title: "Order" };

type Order = {
  id: string; order_number: string; status: string; fulfillment_status: string; payment_method: string; subtotal_npr: number; discount_npr: number; total_npr: number;
  created_at: string; expires_at: string | null; needs_attention: boolean; accepted_no_refund_at: string | null; user_id: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
  order_items: { id: string; product_name: string; quantity: number; unit_price_npr: number; unit_cost_npr: number }[];
  payments: { id: string; method: string; status: string; amount_npr: number; provider_reference: string | null; provider_transaction_id: string | null; created_at: string; verified_at: string | null; note: string | null }[];
  coupons: { code: string } | null;
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = createAdminClient();
  const { data } = await db.from("orders")
    .select("*, profiles(full_name, email, phone), order_items(id, product_name, quantity, unit_price_npr, unit_cost_npr), payments(id, method, status, amount_npr, provider_reference, provider_transaction_id, created_at, verified_at, note), coupons(code)")
    .eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = data as unknown as Order;

  const [{ data: codes }, { data: emails }] = await Promise.all([
    db.from("gift_card_codes").select("id, code, pin, status, cost_npr, order_items(product_name)").eq("order_id", id).in("status", ["sold", "reserved"]),
    db.from("email_deliveries").select("id, template, status, attempts, last_error, sent_at").eq("order_id", id).order("created_at"),
  ]);
  const codeRows = (codes ?? []) as unknown as { id: string; code: string; pin: string | null; status: string; cost_npr: number; order_items: { product_name: string } | null }[];
  const emailRows = (emails ?? []) as { id: string; template: string; status: string; attempts: number; last_error: string | null; sent_at: string | null }[];
  const unpaid = o.status === "pending_payment" || o.status === "payment_verification";
  const cost = o.order_items.reduce((n, i) => n + Number(i.unit_cost_npr) * i.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">&larr; All orders</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-bold">{o.order_number}</h1><StatusPill status={o.status} /></div>
        <p className="text-sm text-ink-soft">Placed {new Date(o.created_at).toLocaleString("en-GB")} · {PAYMENT_METHOD_LABEL[o.payment_method]}</p>
      </div>

      {o.needs_attention && (
        <section className="rounded-card bg-amber-50 p-5" role="alert">
          <p className="font-semibold text-amber-900">Paid but not delivered</p>
          <p className="mt-1 text-sm text-amber-800">The payment was verified but the codes could not be allocated, usually because stock ran out. Add codes to the product(s), then retry.</p>
          <form action={adminRetryDelivery} className="mt-3"><input type="hidden" name="orderId" value={o.id} /><button type="submit" className="btn-primary !py-2">Retry delivery</button></form>
        </section>
      )}

      <section className="card p-6"><h2 className="mb-4 font-semibold">Progress</h2><OrderProgress status={o.status} fulfillment={o.fulfillment_status} /></section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-3 font-semibold">Customer</h2>
          <p>{o.profiles?.full_name ?? "—"}</p><p className="text-sm text-ink-soft">{o.profiles?.email}</p><p className="text-sm text-ink-soft">{o.profiles?.phone ?? "—"}</p>
          <Link href={`/admin/customers/${o.user_id}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">View customer</Link>
          <p className="mt-3 text-xs text-ink-muted">No-refund policy accepted: {o.accepted_no_refund_at ? new Date(o.accepted_no_refund_at).toLocaleString("en-GB") : "not recorded"}</p>
        </section>
        <section className="card p-6">
          <h2 className="mb-3 font-semibold">Money</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatNpr(Number(o.subtotal_npr))}</dd></div>
            {Number(o.discount_npr) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount{o.coupons ? ` (${o.coupons.code})` : ""}</dt><dd>- {formatNpr(Number(o.discount_npr))}</dd></div>}
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatNpr(Number(o.total_npr))}</dd></div>
            <div className="flex justify-between text-ink-soft"><dt>Product cost (at order time)</dt><dd>{formatNpr(cost)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Items</h2>
        <ul className="divide-y divide-ink/10 text-sm">{o.order_items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.product_name} × {i.quantity}</span><span>{formatNpr(Number(i.unit_price_npr) * i.quantity)}</span></li>)}</ul>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Payments</h2>
        {o.payments.length === 0 ? <p className="text-sm text-ink-soft">No payment attempts yet.</p> : (
          <ul className="divide-y divide-ink/10 text-sm">
            {o.payments.map((p) => (
              <li key={p.id} className="py-2">
                <p className="flex flex-wrap justify-between gap-2"><span>{PAYMENT_METHOD_LABEL[p.method]} · {formatNpr(Number(p.amount_npr))}</span><span className={p.status === "paid" ? "font-semibold text-emerald-700" : "text-ink-soft"}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</span></p>
                <p className="text-xs text-ink-muted">{new Date(p.created_at).toLocaleString("en-GB")}{p.provider_transaction_id ? ` · txn ${p.provider_transaction_id}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Delivery</h2>
        {codeRows.length === 0 ? <p className="text-sm text-ink-soft">No codes assigned.</p> : (
          <ul className="space-y-3">{codeRows.map((c) => <li key={c.id}><p className="mb-1 text-sm">{c.order_items?.product_name} · {c.status}</p><CodeReveal code={c.code} pin={c.pin} /></li>)}</ul>
        )}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Emails</h3>
        {emailRows.length === 0 ? <p className="text-sm text-ink-soft">None recorded.</p> : (
          <ul className="text-sm">{emailRows.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 py-1"><span>{(e.template.split(":")[0] ?? "").replace(/_/g, " ")}</span><span className={e.status === "sent" ? "text-emerald-700" : "text-rose-700"}>{e.status}{e.last_error ? ` · ${e.last_error}` : ""}</span></li>)}</ul>
        )}
        {o.status === "completed" && (
          <form action={adminResendDelivery} className="mt-4"><input type="hidden" name="orderId" value={o.id} /><button type="submit" className="btn-outline !py-2">Resend codes email</button></form>
        )}
      </section>

      {unpaid && (
        <section className="card p-6">
          <h2 className="mb-2 font-semibold">Cancel order</h2>
          <p className="mb-3 text-sm text-ink-soft">Releases the reserved codes and any coupon. Only unpaid orders can be cancelled. A bank transfer under review will be cancelled too, so reject or verify it on the Payments page first if one was submitted.</p>
          <form action={adminCancelOrder}><input type="hidden" name="orderId" value={o.id} /><button type="submit" className="btn-outline !py-2 hover:!border-rose-600 hover:!text-rose-700">Cancel this order</button></form>
        </section>
      )}
    </div>
  );
}
