"use client";

import { useActionState } from "react";
import { saveCategory } from "@/app/actions/admin-categories";
import { emptyFormState } from "@/lib/validation/form";
import { Field, FormMessage } from "@/components/auth/Field";

export default function CategoryForm({ id = "", name = "", sortOrder = 0, compact = false }: { id?: string; name?: string; sortOrder?: number; compact?: boolean }) {
  const [state, action, pending] = useActionState(saveCategory, emptyFormState);
  return (
    <form action={action} className={compact ? "flex flex-wrap items-start gap-3" : "card space-y-4 p-6"} noValidate>
      <input type="hidden" name="id" value={id} />
      <div className={compact ? "min-w-[180px] flex-1" : ""}>
        <Field id={`name-${id || "new"}`} name="name" label="Name" defaultValue={state.values.name ?? name} error={state.errors.name} />
      </div>
      <div className={compact ? "w-24" : ""}>
        <Field id={`sortOrder-${id || "new"}`} name="sortOrder" label="Order" type="number" defaultValue={state.values.sortOrder ?? String(sortOrder)} error={state.errors.sortOrder} />
      </div>
      <div className={compact ? "pt-7" : ""}>
        <button type="submit" className="btn-primary !px-5 !py-2.5" disabled={pending}>{pending ? "Saving…" : id ? "Save" : "Add category"}</button>
      </div>
      {state.message && <div className="w-full"><FormMessage ok={state.ok} message={state.message} /></div>}
    </form>
  );
}
