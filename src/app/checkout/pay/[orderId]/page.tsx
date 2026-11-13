import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import { cancelOrder } from "@/app/actions/checkout";
import OnlinePayButton from "@/components/checkout/OnlinePayButton";
import BankTransferPanel from "@/components/checkout/BankTransferPanel";

export const metadata = { title: "Pay for your order" };

type Bank = { bank_name?: string; account_name?: string; account_number?: string; branch?: string };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!z.string().uuid().safeParse(orderId).success) notFound();
  const { user } = await requireUser();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_method, total_npr, subtotal_npr, discount_npr, expires_at, order_items(product_name, quantity)")
    .eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (!order) notFound();
  if (order.status !== "pending_payment") redirect(`/account/orders/${orderId}`);

  let bank: Bank = {};
  if (order.payment_method === "bank_transfer") {
    // Bank details are not public: read server-side, only for the owner of a bank-transfer order.
    const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "bank_account").maybeSingle();
    bank = (data?.value ?? {}) as Bank;
  }
  const items = (order.order_items ?? []) as { product_name: string; quantity: number }[];
  const methodLabel = order.payment_method === "esewa" ? "eSewa" : order.payment_method === "khalti" ? "Khalti" : "Bank transfer";

  return (
    <div className="section max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Complete your payment</h1>
      <p className="mt-1 text-ink-soft">Order {order.order_number} · {methodLabel}</p>
      {order.expires_at && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your gift cards are reserved until {new Date(order.expires_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. After that the order is cancelled and the stock is released.
        </p>
      )}

      <section className="card mt-6 p-6" aria-labelledby="summary">
        <h2 id="summary" className="mb-3 font-semibold">Summary</h2>
        <ul className="text-sm text-ink-soft">{items.map((i, n) => <li key={n}>{i.product_name} × {i.quantity}</li>)}</ul>
        <p className="mt-3 text-2xl font-bold">{formatNpr(Number(order.total_npr))}</p>
      </section>

      <section className="card mt-6 space-y-4 p-6" aria-labelledby="pay">
        <h2 id="pay" className="font-semibold">{order.payment_method === "bank_transfer" ? "Bank transfer" : `Pay with ${methodLabel}`}</h2>
        {order.payment_method === "bank_transfer" ? (
          <>
            <dl className="grid gap-3 rounded-xl bg-surface-alt p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Bank</dt><dd className="font-medium">{bank.bank_name ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Account name</dt><dd className="font-medium">{bank.account_name ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Account number</dt><dd className="font-medium">{bank.account_number ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-ink-muted">Branch</dt><dd className="font-medium">{bank.branch ?? "—"}</dd></div>
            </dl>
            <p className="text-sm text-ink-soft">Transfer exactly <strong>{formatNpr(Number(order.total_npr))}</strong>, then enter the reference and upload your proof below.</p>
            <BankTransferPanel orderId={order.id} userId={user.id} />
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">You will be sent to {methodLabel} to pay. Your gift cards are issued only after {methodLabel} confirms the payment to us.</p>
            <OnlinePayButton orderId={order.id} label={`Pay ${formatNpr(Number(order.total_npr))} with ${methodLabel}`} />
          </>
        )}
      </section>

      <form action={cancelOrder} className="mt-6">
        <input type="hidden" name="orderId" value={order.id} />
        <button type="submit" className="text-sm text-ink-soft hover:text-rose-700">Cancel this order</button>
        <Link href="/account/orders" className="ml-4 text-sm font-semibold text-brand-700 hover:underline">Pay later</Link>
      </form>
    </div>
  );
}
