import { getStorefrontData } from "@/lib/data";
import Hero from "@/components/sections/Hero";
import TrustBar from "@/components/sections/TrustBar";
import CategoryStrip from "@/components/sections/CategoryStrip";
import ProductRow from "@/components/sections/ProductRow";
import PromoBanners from "@/components/sections/PromoBanners";
import ProductCatalogue from "@/components/sections/ProductCatalogue";
import AboutSection from "@/components/sections/AboutSection";
import ReviewsSection from "@/components/sections/ReviewsSection";
import ContactSection from "@/components/sections/ContactSection";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const data = await getStorefrontData();
  const initialCategory = category && data.categories.some((c) => c.slug === category) ? category : "all";

  const featured = data.products.filter((p) => p.is_featured).slice(0, 4);
  const bestsellers = [...data.products].filter((p) => p.sold_count > 0).sort((a, b) => b.sold_count - a.sold_count).slice(0, 4);
  const popular = [...data.products].sort((a, b) => b.sold_count - a.sold_count).slice(0, 4);

  return (
    <>
      <section id="home">
        <Hero />
        <TrustBar />
        <CategoryStrip categories={data.categories} products={data.products} />
        <ProductRow eyebrow="Featured" title="Featured gift cards" products={featured} />
        <ProductRow eyebrow="Popular" title="Popular right now" products={featured.length > 0 ? [] : popular} />
        <ProductRow eyebrow="Bestsellers" title="Our bestsellers" subtitle="Based on real completed sales." products={bestsellers} />
        <PromoBanners />
      </section>
      <section id="products">
        <ProductCatalogue
          key={initialCategory}
          products={data.products}
          categories={data.categories}
          initialCategory={initialCategory}
          loadFailed={data.loadFailed}
        />
      </section>
      <section id="about" className="bg-white"><AboutSection /></section>
      <section id="reviews"><ReviewsSection reviews={data.reviews} /></section>
      <section id="contact" className="bg-white"><ContactSection contact={data.contact} /></section>
    </>
  );
}
