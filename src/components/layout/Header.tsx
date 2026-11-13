"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS, SITE_NAME } from "@/lib/site";
import { signOut } from "@/app/actions/auth";

export default function Header({ user }: { user: { name: string; role: string; cartCount: number } | null }) {
  const pathname = usePathname();
  const [active, setActive] = useState<string>("home");
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    if (!onHome) return;
    const els = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => e !== null);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onHome]);

  const current = onHome ? active : "";

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/#home" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-lg font-bold text-white">E</span>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.id}
              href={`/#${n.id}`}
              aria-current={current === n.id ? "true" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                current === n.id ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:text-brand-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative rounded-full p-2 text-ink-soft transition hover:bg-brand-50 hover:text-brand-700" aria-label="Shopping cart">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
              <circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" />
            </svg>
            {user && user.cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white" aria-label={`${user.cartCount} items in cart`}>{user.cartCount}</span>
            )}
          </Link>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {user.role === "admin" && <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:text-brand-700">Admin</Link>}
              <Link href="/account" className="btn-outline !px-4 !py-2">Account</Link>
              <form action={signOut}><button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:text-rose-700">Log out</button></form>
            </div>
          ) : (
            <Link href="/login" className="btn-primary hidden !px-5 !py-2 sm:inline-flex">Login</Link>
          )}
          <button
            type="button"
            className="rounded-full p-2 text-ink md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink/10 bg-white px-4 py-3 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {NAV_ITEMS.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/#${n.id}`}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-3 font-medium ${current === n.id ? "bg-brand-50 text-brand-700" : "text-ink"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                {user.role === "admin" && <li><Link href="/admin" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 font-medium text-ink">Admin</Link></li>}
                <li><Link href="/account" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">My account</Link></li>
                <li><form action={signOut}><button type="submit" className="w-full rounded-xl px-4 py-3 text-left font-medium text-ink-soft">Log out</button></form></li>
              </>
            ) : (
              <li><Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">Login / Register</Link></li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
