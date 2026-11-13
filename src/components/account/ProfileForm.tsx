"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";
import { emptyAuthState } from "@/lib/validation/auth";
import { Field, FormMessage } from "@/components/auth/Field";

export default function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, { ...emptyAuthState, values: { fullName, phone } });
  return (
    <form action={action} className="card max-w-lg space-y-4 p-6" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <div>
        <label className="label" htmlFor="email-ro">Email address</label>
        <input id="email-ro" className="input bg-surface-alt" value={email} readOnly disabled />
      </div>
      <Field id="fullName" label="Full name" autoComplete="name" defaultValue={state.values.fullName ?? fullName} error={state.errors.fullName} />
      <Field id="phone" label="Phone number" type="tel" autoComplete="tel" defaultValue={state.values.phone ?? phone} error={state.errors.phone} />
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
