import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setProductArchived } from "@/app/actions/admin-products";
import { formatNpr } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Products" };

type Row = {
  id: string; name: string; brand: string; denomination_label: string; selling_price_npr: number; purchase_cost_npr: number;
  is_active: boolean; is_archived: boolean; categories: { name: string } | null;
};
type Stock = { product_id: string; available: number };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const db = createAdminClient();
  const [{ data }, { data: stock }] = await Promise.all([
    db.from("products").select("id, name, brand, denomination_label, selling_price_npr, purchase_cost_npr, is_active, is_archived, categories(name)").eq("is_archived", showArchived).order("brand").order("name"),
    db.rpc("admin_stock_counts"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const avail = new Map(((stock ?? []) as Stock[]).map((s) => [s.product_id, s.available]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{showArchived ? "Archived products" : "Products"}</h1>
        <div className="flex gap-3">
          <Link href={showArchived ? "/admin/products" : "/admin/products?archived=1"} className="btn-outline !py-2">{showArchived ? "Back to products" : "View archived"}</Link>
          {!showArchived && <Link href="/admin/products/new" className="btn-primary !py-2">Add product</Link>}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={showArchived ? "Nothing archived" : "No products yet"} text={showArchived ? undefined : "Add your first gift card product. Each denomination is its own product."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Cost</th><th className="p-4">In stock</th><th className="p-4">Status</th><th className="p-4" /></tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="p-4"><p className="font-medium">{p.name}</p><p className="text-xs text-ink-soft">{p.brand} · {p.denomination_label}</p></td>
                  <td className="p-4 text-ink-soft">{p.categories?.name ?? "—"}</td>
                  <td className="p-4">{formatNpr(Number(p.selling_price_npr))}</td>
                  <td className="p-4 text-ink-soft">{formatNpr(Number(p.purchase_cost_npr))}</td>
                  <td className="p-4"><Link href={`/admin/inventory/${p.id}`} className="font-semibold text-brand-700 hover:underline">{avail.get(p.id) ?? 0}</Link></td>
                  <td className="p-4">{p.is_archived ? "Archived" : p.is_active ? "Visible" : "Hidden"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold text-brand-700 hover:underline">Edit</Link>
                      <form action={setProductArchived}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="archive" value={p.is_archived ? "0" : "1"} />
                        <button type="submit" className="text-ink-soft hover:text-rose-700">{p.is_archived ? "Restore" : "Archive"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
