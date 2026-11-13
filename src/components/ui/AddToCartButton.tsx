"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";

export default function AddToCartButton({ productId, outOfStock, full = false }: { productId: string; outOfStock: boolean; full?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function onClick() {
    setNotice(null);
    start(async () => {
      const r = await addToCart(productId, 1);
      if (r.needsLogin) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setNotice({ ok: r.ok, text: r.message });
      router.refresh(); // updates the cart count in the header
    });
  }

  return (
    <div className={full ? "w-full" : ""}>
      <button type="button" disabled={outOfStock || pending} onClick={onClick} className={`btn-primary ${full ? "w-full" : ""}`}>
        {outOfStock ? "Out of stock" : pending ? "Adding…" : "Add to cart"}
      </button>
      {notice && <p role="status" className={`mt-2 text-xs ${notice.ok ? "text-emerald-700" : "text-rose-700"}`}>{notice.text}</p>}
    </div>
  );
}
