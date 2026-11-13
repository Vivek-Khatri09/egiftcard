import { createAdminClient } from "@/lib/supabase/admin";
import { toggleCategory } from "@/app/actions/admin-categories";
import CategoryForm from "@/components/admin/CategoryForm";

export const metadata = { title: "Categories" };

type Cat = { id: string; name: string; sort_order: number; is_active: boolean };

export default async function AdminCategories() {
  const { data } = await createAdminClient().from("categories").select("id, name, sort_order, is_active").order("sort_order").order("name");
  const cats = (data ?? []) as Cat[];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Categories</h1>
      <CategoryForm />
      <ul className="space-y-3">
        {cats.map((c) => (
          <li key={c.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><CategoryForm id={c.id} name={c.name} sortOrder={c.sort_order} compact /></div>
              <form action={toggleCategory} className="pt-7">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="activate" value={c.is_active ? "0" : "1"} />
                <button type="submit" className={`text-sm font-semibold ${c.is_active ? "text-ink-soft hover:text-rose-700" : "text-emerald-700"}`}>{c.is_active ? "Hide" : "Show"}</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
