import { createAdminClient } from "@/lib/supabase/admin";
import { deleteExpense } from "@/app/actions/admin-expenses";
import { formatNpr } from "@/lib/format";
import { nepalToday } from "@/lib/admin-dates";
import ExpenseForm from "@/components/admin/ExpenseForm";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Expenses" };

type E = { id: string; spent_on: string; category: string; description: string; amount_npr: number };

export default async function AdminExpenses() {
  const { data } = await createAdminClient().from("expenses").select("id, spent_on, category, description, amount_npr").order("spent_on", { ascending: false }).limit(100);
  const rows = (data ?? []) as E[];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Expenses</h1>
      <p className="text-sm text-ink-soft">Business costs other than gift card purchases (those are tracked per code). Expenses are subtracted from profit on the dashboard.</p>
      <ExpenseForm today={nepalToday()} />
      {rows.length === 0 ? <EmptyState title="No expenses recorded" /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Amount</th><th className="p-4" /></tr></thead>
          <tbody className="divide-y divide-ink/10">{rows.map((e) => (
            <tr key={e.id}><td className="p-4">{e.spent_on}</td><td className="p-4 capitalize">{e.category}</td><td className="p-4">{e.description}</td><td className="p-4">{formatNpr(Number(e.amount_npr))}</td>
              <td className="p-4"><form action={deleteExpense}><input type="hidden" name="id" value={e.id} /><button type="submit" className="text-ink-soft hover:text-rose-700">Delete</button></form></td></tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
