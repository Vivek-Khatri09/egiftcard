import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import { overallPaymentStatus, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import OrderProgress from "@/components/account/OrderProgress";
import StatusPill from "@/components/account/StatusPill";
import CodeReveal from "@/components/account/CodeReveal";
import ReviewForm from "@/components/account/ReviewForm";
import { refreshPaymentStatus } from "@/app/actions/checkout";
import { resendDeliveryEmail } from "@/app/actions/email";

export const metadata = { title: "Order details" };


const PAYMENT_NOTICE: Record<string, { text: string; cls: string }> = {
  paid: { text: "Payment confirmed. Thank you! Your order is being processed.", cls: "bg-emerald-50 text-emerald-800" },
  pending: { text: "We haven't received confirmation from the payment provider yet. This can take a few minutes. Use \"check status\" below to look again.", cls: "bg-amber-50 text-amber-800" },
  failed: { text: "The payment was not completed. You can try again below. If money left your account, contact us with your order number.", cls: "bg-rose-50 text-rose-800" },
  error: { text: "We couldn't confirm the payment just now. If money left your account, use \"check status\" below or contact us.", cls: "bg-amber-50 text-amber-800" },
  submitted: { text: "Thank you! We received your transfer details and will verify them soon.", cls: "bg-emerald-50 text-emerald-800" },
};

const EMAIL_NOTICE: Record<string, { text: string; cls: string }> = {
  sent: { text: "We've emailed your codes again.", cls: "bg-emerald-50 text-emerald-800" },
  failed: { text: "We couldn't send the email right now. Your codes are safe in your account on this page. Please try again later.", cls: "bg-amber-50 text-amber-800" },
  limit: { text: "You've reached the limit for resending this email. Your codes are shown on this page. Contact us if you need help.", cls: "bg-amber-50 text-amber-800" },
};

type OrderRow = {
  id: string; order_number: string; status: string; fulfillment_status: string; payment_method: string;
  subtotal_npr: number; discount_npr: number; total_npr: number; created_at: string; expires_at: string | null; needs_attention: boolean;
  order_items: { product_id: string; product_name: string; quantity: number; unit_price_npr: number }[];
  payments: { status: string }[];
};
type CodeRow = { id: string; code: string; pin: string | null; order_items: { product_name: string } | null };

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string; email?: string }> }) {
  const { id } = await params;
  const { payment, email } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { user } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, fulfillment_status, payment_method, subtotal_npr, discount_npr, total_npr, created_at, expires_at, needs_attention, order_items(product_id, product_name, quantity, unit_price_npr), payments(status)")
    .eq("id", id)
    .eq("user_id", user.id) // never show another customer's order, even to staff
    .maybeSingle();
  if (!data) notFound();
  const order = data as unknown as OrderRow;

  let codes: CodeRow[] = [];
  if (order.fulfillment_status === "allocated" || order.fulfillment_status === "delivered") {
    const { data: c } = await supabase
      .from("gift_card_codes")
      .select("id, code, pin, order_items(product_name)")
      .eq("order_id", order.id)
      .eq("status", "sold");
    codes = (c ?? []) as unknown as CodeRow[];
  }

  let reviewed = new Set<string>();
  if (order.status === "completed") {
    const { data: rv } = await supabase.from("reviews").select("product_id").eq("order_id", order.id).eq("user_id", user.id);
    reviewed = new Set(((rv ?? []) as { product_id: string }[]).map((r) => r.product_id));
  }
  const toReview = order.order_items.filter((i, n, all) => !reviewed.has(i.product_id) && all.findIndex((x) => x.product_id === i.product_id) === n);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">&larr; All orders</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{order.order_number}</h1>
          <StatusPill status={order.status} />
        </div>
        <p className="text-sm text-ink-soft">Placed on {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>


      {email && EMAIL_NOTICE[email] && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${EMAIL_NOTICE[email]!.cls}`}>{EMAIL_NOTICE[email]!.text}</p>
      )}
      {payment && PAYMENT_NOTICE[payment] && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${PAYMENT_NOTICE[payment]!.cls}`}>{PAYMENT_NOTICE[payment]!.text}</p>
      )}
      {order.needs_attention && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We received your payment but could not deliver your codes automatically yet. Our team has been flagged and will sort this out. You can also <Link href="/#contact" className="font-semibold underline">contact us</Link> with your order number.
        </p>
      )}
      {order.status === "pending_payment" && (
        <section className="card space-y-3 p-6" aria-labelledby="payneeded">
          <h2 id="payneeded" className="font-semibold">Payment needed</h2>
          {order.expires_at && <p className="text-sm text-ink-soft">Reserved until {new Date(order.expires_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/checkout/pay/${order.id}`} className="btn-primary">Continue to payment</Link>
            {order.payment_method !== "bank_transfer" && (
              <form action={refreshPaymentStatus}>
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className="btn-outline">I already paid: check status</button>
              </form>
            )}
          </div>
        </section>
      )}
      {order.status === "payment_verification" && (
        <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">We received your transfer details and are verifying them. Your gift cards are delivered once the payment is verified.</p>
      )}

      <section className="card p-6" aria-labelledby="progress">
        <h2 id="progress" className="mb-5 font-semibold">Order tracking</h2>
        <OrderProgress status={order.status} fulfillment={order.fulfillment_status} />
      </section>

      <section className="card p-6" aria-labelledby="summary">
        <h2 id="summary" className="mb-4 font-semibold">Summary</h2>
        <ul className="divide-y divide-ink/10 text-sm">
          {order.order_items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4 py-2"><span>{i.product_name} × {i.quantity}</span><span>{formatNpr(Number(i.unit_price_npr) * i.quantity)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatNpr(Number(order.subtotal_npr))}</dd></div>
          {Number(order.discount_npr) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd>- {formatNpr(Number(order.discount_npr))}</dd></div>}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatNpr(Number(order.total_npr))}</dd></div>
          <div className="flex justify-between pt-2"><dt className="text-ink-soft">Payment method</dt><dd>{PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Payment status</dt><dd>{PAYMENT_STATUS_LABEL[overallPaymentStatus(order.payments)]}</dd></div>
        </dl>
      </section>

      <section className="card p-6" aria-labelledby="codes">
        <h2 id="codes" className="mb-4 font-semibold">Your gift card codes</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-ink-soft">Your codes will appear here once your payment is verified and your order is processed.</p>
        ) : (
          <ul className="space-y-4">
            {codes.map((c) => (
              <li key={c.id}>
                <p className="mb-1 text-sm font-medium">{c.order_items?.product_name ?? "Gift card"}</p>
                <CodeReveal code={c.code} pin={c.pin} />
              </li>
            ))}
          </ul>
        )}
        {codes.length > 0 && order.status === "completed" && (
          <form action={resendDeliveryEmail} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn-outline !py-2">Email my codes again</button>
          </form>
        )}
        <p className="mt-5 text-xs text-ink-muted">
          Problem with a code or payment? <Link href="/#contact" className="font-semibold text-brand-700 hover:underline">Contact us</Link> with your order number.
          All digital gift card sales are final; see our <Link href="/policies/refund-policy" className="font-semibold text-brand-700 hover:underline">refund policy</Link>.
        </p>
      </section>
      {order.status === "completed" && toReview.length > 0 && (
        <section className="card space-y-4 p-6" aria-labelledby="review">
          <h2 id="review" className="font-semibold">Review your purchase</h2>
          <p className="text-sm text-ink-soft">Reviews from verified purchases are shown on the store after our team approves them.</p>
          {toReview.map((i) => <ReviewForm key={i.product_id} orderId={order.id} productId={i.product_id} productName={i.product_name} />)}
        </section>
      )}
    </div>
  );
}
