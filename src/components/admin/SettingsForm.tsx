"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/admin-settings";
import { emptyFormState } from "@/lib/validation/form";
import { Field, FormMessage } from "@/components/auth/Field";

export type SettingsField = { name: string; label: string; type?: string; hint?: string };

export default function SettingsForm({ section, title, intro, fields, initial }: { section: string; title: string; intro?: string; fields: SettingsField[]; initial: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings, emptyFormState);
  return (
    <form action={action} className="card space-y-4 p-6" noValidate>
      <div><h2 className="font-semibold">{title}</h2>{intro && <p className="mt-1 text-sm text-ink-soft">{intro}</p>}</div>
      <input type="hidden" name="section" value={section} />
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => <Field key={f.name} id={`${section}-${f.name}`} name={f.name} label={f.label} type={f.type} hint={f.hint} defaultValue={state.values[f.name] ?? initial[f.name] ?? ""} error={state.errors[f.name]} />)}
      </div>
      <button type="submit" className="btn-primary !py-2.5" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
