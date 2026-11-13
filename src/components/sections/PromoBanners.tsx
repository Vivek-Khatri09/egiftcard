import Link from "next/link";

export default function PromoBanners() {
  return (
    <div className="section pb-4">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Special offers</p>
          <h3 className="mt-2 font-display text-2xl font-bold">Have a coupon code?</h3>
          <p className="mt-2 max-w-sm text-white/90">Apply it at checkout to see your discount before you pay.</p>
          <Link href="/#products" className="btn mt-5 bg-white text-brand-700 hover:bg-brand-50">Browse gift cards</Link>
        </div>
        <div className="relative overflow-hidden rounded-card bg-surface-dark p-8 text-white">
          <div className="absolute -bottom-12 -right-6 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">Good to know</p>
          <h3 className="mt-2 font-display text-2xl font-bold">Your codes are always saved</h3>
          <p className="mt-2 max-w-sm text-white/80">After purchase, find every code in your account history, even if an email goes astray.</p>
          <Link href="/#contact" className="btn mt-5 border border-white/30 text-white hover:bg-white/10">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
