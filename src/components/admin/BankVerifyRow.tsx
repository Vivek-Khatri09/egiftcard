"use client";

import { useActionState } from "react";
import { approveBankPayment, rejectBankPayment } from "@/app/actions/admin-payments";
import { emptyFormState } from "@/lib/validation/form";
import { FormMessage } from "@/components/auth/Field";

export default function BankVerifyRow({ paymentId, amount }: { paymentId: string; amount: number }) {
  const [a, approve, approving] = useActionState(approveBankPayment, emptyFormState);
  const [r, reject, rejecting] = useActionState(rejectBankPayment, emptyFormState);
  return (
    <div className="space-y-3">
      <form action={approve} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="paymentId" value={paymentId} />
        <div>
          <label className="label" htmlFor={`rec-${paymentId}`}>Amount received (Rs.)</label>
          <input id={`rec-${paymentId}`} name="received" type="number" step="0.01" min="0" className="input w-40" placeholder={String(amount)} />
        </div>
        <button type="submit" className="btn-primary !py-2.5" disabled={approving}>{approving ? "Verifying…" : "Verify and deliver"}</button>
      </form>
      <form action={reject} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="paymentId" value={paymentId} />
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor={`note-${paymentId}`}>Rejection reason</label>
          <input id={`note-${paymentId}`} name="note" className="input" placeholder="e.g. amount not received" />
        </div>
        <button type="submit" className="btn-outline !py-2.5" disabled={rejecting}>{rejecting ? "Rejecting…" : "Reject"}</button>
      </form>
      <FormMessage ok={a.ok || r.ok} message={a.message || r.message} />
    </div>
  );
}
