"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { emptyAuthState } from "@/lib/validation/auth";
import { Field, FormMessage } from "./Field";

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, emptyAuthState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <Field id="email" label="Email address" type="email" autoComplete="email" defaultValue={state.values.email} error={state.errors.email} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
