import { createClient } from "@/lib/supabase/server";
import type { StockStatus } from "@/types";

export type CartProblem = null | "unavailable" | "out_of_stock" | "insufficient_stock";

export interface CartLine {
  itemId: string;
  productId: string;
  quantity: number;
  name: string;
  brand: string;
  slug: string;
  denomination: string;
  imagePath: string | null;
  unitPrice: number;
  stockCount: number;
  stockStatus: StockStatus | null;
  problem: CartProblem;
  lineTotal: number;
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  hasProblems: boolean;
}

/** The signed-in customer's cart with live prices and stock, or null when logged out. Checkout (Phase 5) re-validates atomically. */
export async function getCart(): Promise<CartSummary | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS limits cart_items to this customer's own cart, so no separate carts lookup is needed.
  const { data: items } = await supabase.from("cart_items").select("id, product_id, quantity").order("id");
  const rows = (items ?? []) as { id: string; product_id: string; quantity: number }[];
  if (rows.length === 0) return { lines: [], itemCount: 0, subtotal: 0, hasProblems: false };

  const { data: products } = await supabase.from("products_public").select("*").in("id", rows.map((r) => r.product_id));
  const byId = new Map(((products ?? []) as Record<string, unknown>[]).map((p) => [String(p.id), p]));

  const lines: CartLine[] = rows.map((r) => {
    const p = byId.get(r.product_id);
    if (!p) {
      return { itemId: r.id, productId: r.product_id, quantity: r.quantity, name: "Gift card no longer available", brand: "", slug: "", denomination: "", imagePath: null, unitPrice: 0, stockCount: 0, stockStatus: null, problem: "unavailable", lineTotal: 0 };
    }
    const stock = Number(p.stock_count ?? 0);
    const unitPrice = Number(p.selling_price_npr);
    const problem: CartProblem = stock === 0 ? "out_of_stock" : r.quantity > stock ? "insufficient_stock" : null;
    return {
      itemId: r.id, productId: r.product_id, quantity: r.quantity,
      name: String(p.name), brand: String(p.brand), slug: String(p.slug), denomination: String(p.denomination_label),
      imagePath: (p.image_path as string | null) ?? null, unitPrice, stockCount: stock,
      stockStatus: p.stock_status as StockStatus, problem, lineTotal: problem ? 0 : unitPrice * r.quantity,
    };
  });

  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    hasProblems: lines.some((l) => l.problem !== null),
  };
}
