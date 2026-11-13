import Link from "next/link";
import type { Product } from "@/types";
import { formatNpr } from "@/lib/format";
import ProductImage from "./ProductImage";
import StockBadge from "./StockBadge";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/products/${p.slug}`} aria-label={p.name}>
        <ProductImage brand={p.brand} denomination={p.denomination_label} imagePath={p.image_path} alt={p.name} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{p.brand}</p>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={`/products/${p.slug}`} className="hover:text-brand-700">{p.name}</Link>
        </h3>
        <p className="mt-1 text-sm text-ink-soft">Denomination: {p.denomination_label}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <StockBadge status={p.stock_status} />
          <span className="text-xs text-ink-soft">{p.stock_count} available</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="text-xl font-bold">{formatNpr(p.selling_price_npr)}</p>
          <AddToCartButton productId={p.id} outOfStock={p.stock_status === "out_of_stock"} />
        </div>
      </div>
    </article>
  );
}
