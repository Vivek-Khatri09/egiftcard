"use client";

import { useActionState } from "react";
import { addSingleCode } from "@/app/actions/admin-inventory";
import { emptyFormState } from "@/lib/validation/form";
import { Field, FormMessage } from "@/components/auth/Field";

export default function AddCodeForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(addSingleCode, emptyFormState);
  return (
    <form key={state.ok ? "added" : "form"} action={action} className="card space-y-4 p-6" noValidate>
      <h2 className="font-semibold">Add a single code</h2>
      <input type="hidden" name="productId" value={productId} />
      <FormMessage ok={state.ok} message={state.message} />
      <Field id="code" label="Gift card code" defaultValue={state.values.code} error={state.errors.code} autoComplete="off" />
      <Field id="pin" label="PIN (optional)" defaultValue={state.values.pin} error={state.errors.pin} autoComplete="off" />
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add code"}</button>
    </form>
  );
}
