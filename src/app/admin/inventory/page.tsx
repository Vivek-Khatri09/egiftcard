import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Inventory" };

type P = { id: string; name: string; brand: string; low_stock_threshold: number; is_active: boolean };
type Stock = { product_id: string; available: number; sold: number; voided: number };

export default async function InventoryPage() {
  const db = createAdminClient();
  const [{ data: products }, { data: stock }] = await Promise.all([
    db.from("products").select("id, name, brand, low_stock_threshold, is_active").eq("is_archived", false).order("brand").order("name"),
    db.rpc("admin_stock_counts"),
  ]);
  const rows = (products ?? []) as P[];
  const counts = new Map(((stock ?? []) as Stock[]).map((s) => [s.product_id, s]));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Inventory</h1>
      {rows.length === 0 ? (
        <EmptyState title="No products yet" text="Create a product first, then add its gift card codes." action={<Link href="/admin/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-4">Product</th><th className="p-4">Available</th><th className="p-4">Sold</th><th className="p-4">Voided</th><th className="p-4">Level</th><th className="p-4" /></tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((p) => {
                const c = counts.get(p.id);
                const a = c?.available ?? 0;
                const level = a === 0 ? { t: "Out of stock", cls: "text-rose-700" } : a <= p.low_stock_threshold ? { t: "Low stock", cls: "text-amber-700" } : { t: "In stock", cls: "text-emerald-700" };
                return (
                  <tr key={p.id}>
                    <td className="p-4"><p className="font-medium">{p.name}</p><p className="text-xs text-ink-soft">{p.brand}{p.is_active ? "" : " · hidden"}</p></td>
                    <td className="p-4 font-semibold">{a}</td>
                    <td className="p-4">{c?.sold ?? 0}</td>
                    <td className="p-4 text-ink-soft">{c?.voided ?? 0}</td>
                    <td className={`p-4 font-medium ${level.cls}`}>{level.t}</td>
                    <td className="p-4"><Link href={`/admin/inventory/${p.id}`} className="font-semibold text-brand-700 hover:underline">Manage codes</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
