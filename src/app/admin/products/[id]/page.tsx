import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductForm, { type ProductFormValues } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const db = createAdminClient();
  const [{ data: p }, { data: cats }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("id, name").order("sort_order"),
  ]);
  if (!p) notFound();

  const initial: ProductFormValues = {
    id: p.id, categoryId: p.category_id ?? "", brand: p.brand, name: p.name, description: p.description ?? "",
    denominationLabel: p.denomination_label, denominationValue: p.denomination_value == null ? "" : String(p.denomination_value),
    denominationCurrency: p.denomination_currency ?? "", sellingPrice: String(p.selling_price_npr), purchaseCost: String(p.purchase_cost_npr),
    lowStockThreshold: String(p.low_stock_threshold), imagePath: p.image_path ?? "", isActive: Boolean(p.is_active), isFeatured: Boolean(p.is_featured),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm font-semibold text-brand-700 hover:underline">&larr; All products</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">{p.name}</h1>
          <Link href={`/admin/inventory/${p.id}`} className="btn-outline !py-2">Manage codes</Link>
        </div>
        {created === "1" && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Product created. Now add some gift card codes so customers can buy it.</p>}
      </div>
      <ProductForm initial={initial} categories={(cats ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
