"use client";

import { useActionState } from "react";
import { addExpense } from "@/app/actions/admin-expenses";
import { emptyFormState } from "@/lib/validation/form";
import { Field, FormMessage } from "@/components/auth/Field";

export default function ExpenseForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addExpense, emptyFormState);
  return (
    <form key={state.ok ? "saved" : "form"} action={action} className="card space-y-4 p-6" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="spentOn" label="Date" type="date" defaultValue={state.values.spentOn || today} error={state.errors.spentOn} />
        <div><label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" className="input" defaultValue={state.values.category || "other"}>
            <option value="marketing">Marketing</option><option value="software">Software and hosting</option><option value="fees">Fees</option><option value="salary">Salary</option><option value="other">Other</option>
          </select></div>
        <Field id="description" label="Description" defaultValue={state.values.description} error={state.errors.description} />
        <Field id="amount" label="Amount (Rs.)" type="number" defaultValue={state.values.amount} error={state.errors.amount} />
      </div>
      <button type="submit" className="btn-primary !py-2.5" disabled={pending}>{pending ? "Saving…" : "Add expense"}</button>
    </form>
  );
}
