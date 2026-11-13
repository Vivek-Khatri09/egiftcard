"use client";

import { useActionState } from "react";
import { submitContact } from "@/app/actions/contact";
import { emptyContactState } from "@/lib/validation/contact";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-rose-600" role="alert">{message}</p> : null;
}

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, emptyContactState);

  return (
    <form key={state.ok ? "sent" : "form"} action={action} className="card space-y-4 p-6" noValidate>
      {state.message && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
        >
          {state.message}
        </p>
      )}
      {/* Honeypot: hidden from people, tempting for bots */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="fullName" className="label">Full name</label>
        <input id="fullName" name="fullName" className="input" autoComplete="name" defaultValue={state.values.fullName} aria-invalid={!!state.errors.fullName} />
        <FieldError message={state.errors.fullName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" defaultValue={state.values.email} aria-invalid={!!state.errors.email} />
          <FieldError message={state.errors.email} />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone number</label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" defaultValue={state.values.phone} aria-invalid={!!state.errors.phone} />
          <FieldError message={state.errors.phone} />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="label">How can we help?</label>
        <textarea id="description" name="description" rows={5} className="input" defaultValue={state.values.description} aria-invalid={!!state.errors.description} />
        <FieldError message={state.errors.description} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
