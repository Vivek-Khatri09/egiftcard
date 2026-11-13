import Link from "next/link";
import type { Category, Product } from "@/types";
import SectionHeading from "@/components/ui/SectionHeading";

export default function CategoryStrip({ categories, products }: { categories: Category[]; products: Product[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="section pb-4">
      <SectionHeading eyebrow="Categories" title="Shop by category" />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <li key={c.id}>
              <Link
                href={`/?category=${c.slug}#products`}
                className="card flex h-full flex-col items-center px-4 py-6 text-center transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 font-display text-xl font-bold text-brand-700" aria-hidden>
                  {c.name.charAt(0)}
                </span>
                <span className="mt-3 font-semibold">{c.name}</span>
                <span className="text-xs text-ink-soft">{count} {count === 1 ? "gift card" : "gift cards"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
