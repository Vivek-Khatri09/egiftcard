"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { emptyAuthState } from "@/lib/validation/auth";
import { Field, FormMessage } from "./Field";

export default function ResetForm() {
  const [state, action, pending] = useActionState(resetPassword, emptyAuthState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={false} message={state.message} />
      <Field id="password" label="New password" type="password" autoComplete="new-password" error={state.errors.password} hint="At least 8 characters, with a letter and a number." />
      <Field id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" error={state.errors.confirmPassword} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Update password"}</button>
    </form>
  );
}
