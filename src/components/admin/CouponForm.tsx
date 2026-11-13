"use client";

import { useActionState } from "react";
import { saveCoupon } from "@/app/actions/admin-coupons";
import { emptyFormState } from "@/lib/validation/form";
import { Field, FormMessage } from "@/components/auth/Field";

export type CouponValues = {
  id: string; code: string; discountType: string; discountValue: string; maxDiscount: string;
  minPurchase: string; usageLimit: string; expiresAt: string; isActive: boolean;
};
export const blankCoupon: CouponValues = { id: "", code: "", discountType: "percentage", discountValue: "", maxDiscount: "", minPurchase: "", usageLimit: "", expiresAt: "", isActive: true };

export default function CouponForm({ initial }: { initial: CouponValues }) {
  const [state, action, pending] = useActionState(saveCoupon, emptyFormState);
  const uid = initial.id || "new";
  const v = (k: keyof CouponValues) => state.values[k as string] ?? String(initial[k] ?? "");
  const active = Object.keys(state.values).length ? state.values.isActive === "on" : initial.isActive;

  return (
    <form key={state.ok && !initial.id ? "saved" : "form"} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={initial.id} />
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`code-${uid}`} name="code" label="Code" defaultValue={v("code")} error={state.errors.code} autoComplete="off" />
        <div>
          <label className="label" htmlFor={`type-${uid}`}>Type</label>
          <select id={`type-${uid}`} name="discountType" className="input" defaultValue={v("discountType")}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount (Rs.)</option>
          </select>
        </div>
        <Field id={`value-${uid}`} name="discountValue" label="Discount value" type="number" defaultValue={v("discountValue")} error={state.errors.discountValue} />
        <Field id={`max-${uid}`} name="maxDiscount" label="Max discount (Rs., optional)" type="number" defaultValue={v("maxDiscount")} error={state.errors.maxDiscount} />
        <Field id={`min-${uid}`} name="minPurchase" label="Minimum purchase (Rs.)" type="number" defaultValue={v("minPurchase")} error={state.errors.minPurchase} />
        <Field id={`limit-${uid}`} name="usageLimit" label="Usage limit (optional)" type="number" defaultValue={v("usageLimit")} error={state.errors.usageLimit} />
        <Field id={`exp-${uid}`} name="expiresAt" label="Expires (Nepal time, optional)" type="datetime-local" defaultValue={v("expiresAt")} error={state.errors.expiresAt} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={active} /> Active</label>
      </div>
      <button type="submit" className="btn-primary !py-2.5" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save coupon" : "Create coupon"}</button>
    </form>
  );
}
