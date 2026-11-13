"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { placeOrder, previewCoupon } from "@/app/actions/checkout";
import { emptyFormState } from "@/lib/validation/form";
import { formatNpr } from "@/lib/format";
import { FormMessage } from "@/components/auth/Field";

const METHODS = [
  { id: "esewa", label: "eSewa", note: "Pay with your eSewa wallet. Codes are issued once eSewa confirms the payment." },
  { id: "khalti", label: "Khalti", note: "Pay with Khalti. Codes are issued once Khalti confirms the payment." },
  { id: "bank_transfer", label: "Bank transfer", note: "Transfer to our bank account and upload proof. We verify manually, so delivery takes longer." },
] as const;

export default function CheckoutForm({ subtotal, available }: { subtotal: number; available: Record<"esewa" | "khalti" | "bank_transfer", boolean> }) {
  const [state, action, pending] = useActionState(placeOrder, emptyFormState);
  const [coupon, setCoupon] = useState(state.values.coupon ?? "");
  const [preview, setPreview] = useState<{ ok: boolean; discount: number; message: string } | null>(null);
  const [checking, startCheck] = useTransition();

  const discount = preview?.ok ? preview.discount : 0;
  const methods = METHODS.filter((m) => available[m.id]);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage ok={false} message={state.message} />

      <fieldset className="card space-y-3 p-6">
        <legend className="px-1 font-semibold">Payment method</legend>
        {methods.length === 0 && <p className="text-sm text-rose-700">No payment methods are available right now. Please contact us.</p>}
        {methods.map((m) => (
          <label key={m.id} className="flex cursor-pointer gap-3 rounded-xl border border-ink/15 p-4 hover:border-brand-500">
            <input type="radio" name="method" value={m.id} defaultChecked={state.values.method === m.id || methods.length === 1} required className="mt-1" />
            <span>
              <span className="block font-medium">{m.label}</span>
              <span className="text-sm text-ink-soft">{m.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="card space-y-3 p-6">
        <label htmlFor="coupon" className="font-semibold">Coupon code (optional)</label>
        <div className="flex gap-2">
          <input id="coupon" name="coupon" className="input" value={coupon} maxLength={40} autoComplete="off" onChange={(e) => { setCoupon(e.target.value); setPreview(null); }} />
          <button type="button" className="btn-outline shrink-0" disabled={checking || !coupon.trim()} onClick={() => startCheck(async () => setPreview(await previewCoupon(coupon)))}>
            {checking ? "Checking…" : "Apply"}
          </button>
        </div>
        {preview && <p role="status" className={`text-sm ${preview.ok ? "text-emerald-700" : "text-rose-700"}`}>{preview.ok ? `Coupon applied: you save ${formatNpr(preview.discount)}.` : preview.message}</p>}
      </div>

      <div className="card space-y-3 p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatNpr(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd>- {formatNpr(discount)}</dd></div>}
          <div className="flex justify-between border-t border-ink/10 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatNpr(subtotal - discount)}</dd></div>
        </dl>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="accepted" required className="mt-1" />
          <span>
            I understand that <strong>all digital gift card sales are final</strong>, and I agree to the{" "}
            <Link href="/policies/refund-policy" target="_blank" className="font-semibold text-brand-700 underline">Refund Policy</Link> and{" "}
            <Link href="/policies/terms" target="_blank" className="font-semibold text-brand-700 underline">Terms</Link>.
          </span>
        </label>
        <button type="submit" className="btn-primary w-full" disabled={pending || methods.length === 0}>{pending ? "Placing order…" : "Place order"}</button>
        <p className="text-xs text-ink-muted">Placing the order reserves your gift cards. You pay on the next step.</p>
      </div>
    </form>
  );
}
