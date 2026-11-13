import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import { overallPaymentStatus, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/account/StatusPill";

export const metadata = { title: "My orders" };

type Item = { product_name: string; quantity: number };
type Order = {
  id: string; order_number: string; status: string; payment_method: string; total_npr: number; created_at: string;
  order_items: Item[]; payments: { status: string }[];
};

export default async function OrdersPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_method, total_npr, created_at, order_items(product_name, quantity), payments(status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as unknown as Order[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Order history</h1>
      {error ? (
        <EmptyState title="We couldn't load your orders" text="Please refresh the page in a moment." />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" text="When you buy a gift card, it will show up here." action={<Link href="/#products" className="btn-primary">Browse gift cards</Link>} />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/account/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.order_number}</Link>
                  <p className="text-xs text-ink-soft">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <StatusPill status={o.status} />
              </div>
              <ul className="mt-3 text-sm text-ink-soft">
                {o.order_items.map((i, idx) => <li key={idx}>{i.product_name} × {i.quantity}</li>)}
              </ul>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Total</dt><dd className="font-semibold">{formatNpr(Number(o.total_npr))}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Payment method</dt><dd>{PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Payment status</dt><dd>{PAYMENT_STATUS_LABEL[overallPaymentStatus(o.payments)]}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
