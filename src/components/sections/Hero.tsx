import Link from "next/link";

const CHIPS = ["Prices in NPR", "eSewa · Khalti · Bank transfer", "Codes in your email and account"];

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-surface-alt to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
        <div className="animate-fade-up">
          <p className="mb-4 inline-flex rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">
            Digital gift card store
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Digital gift cards, delivered <span className="text-brand-600">automatically</span> after verified payment.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Browse popular gift cards, pay in Nepalese Rupees, and receive your code by email and in your account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#products" className="btn-primary">Shop gift cards</Link>
            <Link href="/#about" className="btn-outline">Why {"Egiftcard"}?</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <li key={c} className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">{c}</li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto hidden h-80 w-full max-w-md lg:block" aria-hidden>
          <div className="absolute left-0 top-10 h-44 w-72 animate-floaty rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-lift [--r:-8deg]" style={{ animationDelay: "0.4s" }}>
            <p className="text-xs uppercase tracking-widest text-white/70">Gift Card</p>
            <p className="mt-16 font-display text-xl font-bold">Gaming</p>
          </div>
          <div className="absolute right-0 top-0 h-44 w-72 animate-floaty rounded-2xl bg-gradient-to-br from-brand-500 to-red-600 p-5 text-white shadow-lift [--r:6deg]">
            <p className="text-xs uppercase tracking-widest text-white/80">Gift Card</p>
            <p className="mt-16 font-display text-xl font-bold">Streaming</p>
          </div>
          <div className="absolute bottom-0 left-12 h-44 w-72 animate-floaty rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-5 text-white shadow-lift [--r:-2deg]" style={{ animationDelay: "0.8s" }}>
            <p className="text-xs uppercase tracking-widest text-white/80">Gift Card</p>
            <p className="mt-16 font-display text-xl font-bold">Shopping</p>
          </div>
        </div>
      </div>
    </div>
  );
}
