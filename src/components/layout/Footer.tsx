import Link from "next/link";
import { NAV_ITEMS, POLICY_LINKS, SITE_NAME } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-surface-dark text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-bold text-white">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm text-sm">
            Digital gift cards, priced in NPR and delivered automatically once your payment is verified.
          </p>
          <p className="mt-4 text-sm">We accept eSewa, Khalti and bank transfer.</p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Explore</p>
          <ul className="space-y-2 text-sm">
            {NAV_ITEMS.map((n) => (
              <li key={n.id}><Link href={`/#${n.id}`} className="hover:text-brand-300">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Policies</p>
          <ul className="space-y-2 text-sm">
            {POLICY_LINKS.map((p) => (
              <li key={p.slug}><Link href={`/policies/${p.slug}`} className="hover:text-brand-300">{p.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        <p>All digital gift card sales are final. See our Refund Policy for details.</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
      </div>
    </footer>
  );
}
