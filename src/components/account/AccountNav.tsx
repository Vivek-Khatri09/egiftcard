"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/codes", label: "Gift cards" },
  { href: "/account/profile", label: "Profile" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {ITEMS.map((i) => {
        const active = i.href === "/account" ? pathname === "/account" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition lg:rounded-xl ${active ? "bg-brand-600 text-white" : "bg-white text-ink-soft hover:text-brand-700"}`}
          >
            {i.label}
          </Link>
        );
      })}
      <form action={signOut}>
        <button type="submit" className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-soft transition hover:text-rose-700 lg:w-full lg:rounded-xl lg:text-left">
          Log out
        </button>
      </form>
    </nav>
  );
}
