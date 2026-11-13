"use client";

import { useActionState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { emptyFormState } from "@/lib/validation/form";
import { FieldError, FormMessage } from "@/components/auth/Field";

export default function ReviewForm({ orderId, productId, productName }: { orderId: string; productId: string; productName: string }) {
  const [state, action, pending] = useActionState(submitReview, emptyFormState);
  if (state.ok) return <FormMessage ok message={state.message} />;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-ink/10 p-4" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="productId" value={productId} />
      <p className="font-medium">{productName}</p>
      <FormMessage ok={false} message={state.message} />
      <div>
        <label className="label" htmlFor={`rating-${productId}`}>Rating</label>
        <select id={`rating-${productId}`} name="rating" className="input max-w-[200px]" defaultValue={state.values.rating || "5"}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
        </select>
        <FieldError message={state.errors.rating} />
      </div>
      <div>
        <label className="label" htmlFor={`body-${productId}`}>Your review</label>
        <textarea id={`body-${productId}`} name="body" rows={3} className="input" defaultValue={state.values.body} />
        <FieldError message={state.errors.body} />
      </div>
      <button type="submit" className="btn-primary !py-2" disabled={pending}>{pending ? "Sending…" : "Submit review"}</button>
    </form>
  );
}
