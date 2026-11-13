export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-rose-600" role="alert">{message}</p> : null;
}

export function Field({
  id, name, label, type = "text", autoComplete, defaultValue, error, hint,
}: {
  id: string; name?: string; label: string; type?: string; autoComplete?: string; defaultValue?: string; error?: string; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={name ?? id} type={type} className="input" autoComplete={autoComplete} defaultValue={defaultValue} aria-invalid={!!error} />
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

export function FormMessage({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null;
  return (
    <p role="status" className={`rounded-xl px-4 py-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{message}</p>
  );
}
