"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@/types";
import ProductCard from "@/components/ui/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeading from "@/components/ui/SectionHeading";

type Sort = "newest" | "price_asc" | "price_desc" | "popular";
type Avail = "all" | "in_stock" | "low_stock" | "out_of_stock";
const PAGE_SIZE = 12;

export default function ProductCatalogue({
  products,
  categories,
  initialCategory,
  loadFailed,
}: {
  products: Product[];
  categories: Category[];
  initialCategory: string;
  loadFailed: boolean;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState("all");
  const [avail, setAvail] = useState<Avail>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    const list = products.filter((p) => {
      const cat = p.category_id ? catById.get(p.category_id) : undefined;
      if (term && !`${p.name} ${p.brand} ${cat?.name ?? ""}`.toLowerCase().includes(term)) return false;
      if (category !== "all" && cat?.slug !== category) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (avail !== "all" && p.stock_status !== avail) return false;
      if (min !== null && !Number.isNaN(min) && p.selling_price_npr < min) return false;
      if (max !== null && !Number.isNaN(max) && p.selling_price_npr > max) return false;
      return true;
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "price_asc": return a.selling_price_npr - b.selling_price_npr;
        case "price_desc": return b.selling_price_npr - a.selling_price_npr;
        case "popular": return b.sold_count - a.sold_count;
        default: return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [products, catById, q, category, brand, avail, minPrice, maxPrice, sort]);

  const hasFilters = q !== "" || category !== "all" || brand !== "all" || avail !== "all" || minPrice !== "" || maxPrice !== "";
  const reset = () => { setQ(""); setCategory("all"); setBrand("all"); setAvail("all"); setMinPrice(""); setMaxPrice(""); setVisible(PAGE_SIZE); };
  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setVisible(PAGE_SIZE); };

  return (
    <div className="section">
      <SectionHeading eyebrow="Products" title="All gift cards" subtitle="Each denomination is its own product, with its own price and live stock." />

      <div className="card mb-8 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-4">
            <label htmlFor="q" className="label">Search</label>
            <input id="q" type="search" className="input" placeholder="Search by name, brand or category" value={q} onChange={(e) => touch(setQ)(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cat" className="label">Category</label>
            <select id="cat" className="input" value={category} onChange={(e) => touch(setCategory)(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="brand" className="label">Brand</label>
            <select id="brand" className="input" value={brand} onChange={(e) => touch(setBrand)(e.target.value)}>
              <option value="all">All brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="avail" className="label">Availability</label>
            <select id="avail" className="input" value={avail} onChange={(e) => touch(setAvail)(e.target.value as Avail)}>
              <option value="all">Any</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="label">Sort by</label>
            <select id="sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Newest</option>
              <option value="popular">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <span className="label">Price range (Rs.)</span>
            <div className="flex items-center gap-2">
              <input aria-label="Minimum price" type="number" min={0} inputMode="numeric" className="input" placeholder="Min" value={minPrice} onChange={(e) => touch(setMinPrice)(e.target.value)} />
              <span className="text-ink-muted">–</span>
              <input aria-label="Maximum price" type="number" min={0} inputMode="numeric" className="input" placeholder="Max" value={maxPrice} onChange={(e) => touch(setMaxPrice)(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span aria-live="polite">{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
          {hasFilters && <button type="button" onClick={reset} className="font-semibold text-brand-700 hover:underline">Clear all filters</button>}
        </div>
      </div>

      {loadFailed ? (
        <EmptyState title="We couldn't load the catalogue" text="Please refresh the page in a moment. If the problem continues, contact us." />
      ) : products.length === 0 ? (
        <EmptyState title="No gift cards yet" text="New gift cards will appear here soon." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No gift cards match your search"
          text="Try removing a filter or searching for something else."
          action={<button type="button" onClick={reset} className="btn-outline">Clear filters</button>}
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, visible).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {filtered.length > visible && (
            <div className="mt-10 text-center">
              <button type="button" className="btn-outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Show more</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
