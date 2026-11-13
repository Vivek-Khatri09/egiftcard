"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { emptyAuthState } from "@/lib/validation/auth";
import { Field, FormMessage } from "./Field";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, emptyAuthState);

  if (state.ok) {
    return (
      <div className="space-y-3 text-center">
        <p className="font-display text-xl font-semibold">Check your email</p>
        <FormMessage ok message={state.message} />
        <p className="text-sm text-ink-soft">Can&apos;t find it? Check your spam folder.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={false} message={state.message} />
      <Field id="fullName" label="Full name" autoComplete="name" defaultValue={state.values.fullName} error={state.errors.fullName} />
      <Field id="email" label="Email address" type="email" autoComplete="email" defaultValue={state.values.email} error={state.errors.email} />
      <Field id="phone" label="Phone number" type="tel" autoComplete="tel" defaultValue={state.values.phone} error={state.errors.phone} />
      <Field id="password" label="Password" type="password" autoComplete="new-password" error={state.errors.password} hint="At least 8 characters, with a letter and a number." />
      <Field id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={state.errors.confirmPassword} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-xs text-ink-muted">All digital gift card sales are final. By registering you agree to our terms and privacy policy.</p>
    </form>
  );
}
