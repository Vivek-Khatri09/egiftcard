import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductForm, { blankProduct } from "@/components/admin/ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { data } = await createAdminClient().from("categories").select("id, name").order("sort_order");
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm font-semibold text-brand-700 hover:underline">&larr; All products</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Add product</h1>
        <p className="text-sm text-ink-soft">Create one product per denomination, for example &ldquo;Steam Gift Card $10&rdquo; and &ldquo;Steam Gift Card $20&rdquo;. Add codes after saving.</p>
      </div>
      <ProductForm initial={blankProduct} categories={(data ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
