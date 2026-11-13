import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import CodeReveal from "@/components/account/CodeReveal";

export const metadata = { title: "My gift cards" };

type Row = {
  id: string; code: string; pin: string | null; sold_at: string | null; order_id: string;
  order_items: { product_name: string } | null; orders: { order_number: string } | null;
};

export default async function CodesPage() {
  await requireUser();
  const supabase = await createClient();
  // RLS returns only sold codes that belong to this customer's own orders.
  const { data, error } = await supabase
    .from("gift_card_codes")
    .select("id, code, pin, sold_at, order_id, order_items(product_name), orders(order_number)")
    .eq("status", "sold")
    .order("sold_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Gift card history</h1>
        <p className="mt-1 text-ink-soft">Every code you have purchased. Codes stay hidden until you reveal them. Never share them with anyone you don&apos;t trust.</p>
      </div>
      {error ? (
        <EmptyState title="We couldn't load your gift cards" text="Please refresh the page in a moment." />
      ) : rows.length === 0 ? (
        <EmptyState title="No gift cards yet" text="Purchased codes will appear here after your payment is verified." action={<Link href="/#products" className="btn-primary">Browse gift cards</Link>} />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{r.order_items?.product_name ?? "Gift card"}</p>
                <Link href={`/account/orders/${r.order_id}`} className="text-sm font-semibold text-brand-700 hover:underline">{r.orders?.order_number ?? "Order"}</Link>
              </div>
              <CodeReveal code={r.code} pin={r.pin} />
              {r.sold_at && <p className="mt-2 text-xs text-ink-muted">Purchased {new Date(r.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
