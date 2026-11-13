"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerification, signIn } from "@/app/actions/auth";
import { emptyAuthState } from "@/lib/validation/auth";
import { Field, FormMessage } from "./Field";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, emptyAuthState);
  const [resend, resendAction, resending] = useActionState(resendVerification, emptyAuthState);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage ok={false} message={state.message} />
      {resend.message && <FormMessage ok={resend.ok} message={resend.message} />}
      <Field id="email" label="Email address" type="email" autoComplete="email" defaultValue={state.values.email} error={state.errors.email} />
      <Field id="password" label="Password" type="password" autoComplete="current-password" error={state.errors.password} />
      <div className="text-right text-sm"><Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">Forgot password?</Link></div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
      {state.needsVerification && (
        <button type="submit" formAction={resendAction} className="btn-outline w-full" disabled={resending}>
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </form>
  );
}
