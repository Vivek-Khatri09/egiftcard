import { createClient } from "@/lib/supabase/server";
import type { Category, ContactInfo, Product, PublicReview, StockStatus } from "@/types";

const FALLBACK_CONTACT: ContactInfo = {
  address: "[Business address]",
  email: "[business@email]",
  phone: "[+977-XXXXXXXXXX]",
};

type Row = Record<string, unknown>;

function toProduct(r: Row): Product {
  return {
    id: String(r.id),
    category_id: (r.category_id as string | null) ?? null,
    brand: String(r.brand),
    name: String(r.name),
    slug: String(r.slug),
    description: (r.description as string | null) ?? null,
    denomination_label: String(r.denomination_label),
    selling_price_npr: Number(r.selling_price_npr),
    image_path: (r.image_path as string | null) ?? null,
    is_featured: Boolean(r.is_featured),
    created_at: String(r.created_at),
    stock_count: Number(r.stock_count ?? 0),
    stock_status: r.stock_status as StockStatus,
    sold_count: Number(r.sold_count ?? 0),
  };
}

export interface StorefrontData {
  products: Product[];
  categories: Category[];
  reviews: PublicReview[];
  contact: ContactInfo;
  loadFailed: boolean;
}

/** Everything the public storefront needs. Stock counts always come from the database. */
export async function getStorefrontData(): Promise<StorefrontData> {
  try {
    const supabase = await createClient();
    const [prod, cat, rev, set] = await Promise.all([
      supabase.from("products_public").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
      supabase.rpc("get_public_reviews", { p_limit: 12 }),
      supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    ]);

    const settings = (set.data?.value ?? {}) as Partial<ContactInfo>;
    return {
      products: ((prod.data ?? []) as Row[]).map(toProduct),
      categories: (cat.data ?? []) as Category[],
      // Reviews degrade gracefully if migration 0006 has not been applied yet.
      reviews: rev.error ? [] : ((rev.data ?? []) as PublicReview[]),
      contact: {
        address: settings.address ?? FALLBACK_CONTACT.address,
        email: settings.email ?? FALLBACK_CONTACT.email,
        phone: settings.phone ?? FALLBACK_CONTACT.phone,
      },
      loadFailed: Boolean(prod.error || cat.error),
    };
  } catch {
    return { products: [], categories: [], reviews: [], contact: FALLBACK_CONTACT, loadFailed: true };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("products_public").select("*").eq("slug", slug).maybeSingle();
    return data ? toProduct(data as Row) : null;
  } catch {
    return null;
  }
}
