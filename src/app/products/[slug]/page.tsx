import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data";
import { formatNpr } from "@/lib/format";
import ProductImage from "@/components/ui/ProductImage";
import StockBadge from "@/components/ui/StockBadge";
import AddToCartButton from "@/components/ui/AddToCartButton";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return { title: p ? p.name : "Gift card not found" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const out = p.stock_status === "out_of_stock";

  return (
    <div className="section">
      <Link href="/#products" className="text-sm font-semibold text-brand-700 hover:underline">&larr; Back to all gift cards</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <ProductImage brand={p.brand} denomination={p.denomination_label} imagePath={p.image_path} alt={p.name} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{p.brand}</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <p className="mt-2 text-ink-soft">Denomination: {p.denomination_label}</p>
          <p className="mt-5 text-3xl font-bold">{formatNpr(p.selling_price_npr)}</p>
          <div className="mt-4 flex items-center gap-3">
            <StockBadge status={p.stock_status} />
            <span className="text-sm text-ink-soft">{p.stock_count} available</span>
          </div>
          {p.description && <p className="mt-6 whitespace-pre-line text-ink-soft">{p.description}</p>}
          <div className="mt-8"><AddToCartButton productId={p.id} outOfStock={out} /></div>

          <ul className="mt-8 space-y-2 rounded-card bg-white p-5 text-sm text-ink-soft shadow-card">
            <li>Delivered by email and saved in your account after your payment is verified.</li>
            <li>An account is required to purchase. Browsing is open to everyone.</li>
            <li>
              All digital gift card sales are final.{" "}
              <Link href="/policies/refund-policy" className="font-semibold text-brand-700 hover:underline">Read the refund policy</Link>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
