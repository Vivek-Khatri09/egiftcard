"use client";

import { useOptimistic, useTransition } from "react";
import { setCartQuantity } from "@/app/actions/cart";

/** Updates the number instantly; the server then confirms (and corrects it if stock is lower). */
export default function QuantityControl({ itemId, quantity, max, name, unavailable }: { itemId: string; quantity: number; max: number; name: string; unavailable: boolean }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(quantity);

  function change(next: number) {
    start(async () => {
      setShown(next);
      const fd = new FormData();
      fd.set("itemId", itemId);
      fd.set("quantity", String(next));
      await setCartQuantity(fd);
    });
  }

  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 hover:border-brand-600 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Quantity for ${name}`} aria-busy={pending}>
      <button type="button" aria-label="Decrease quantity" className={btn} disabled={pending} onClick={() => change(shown - 1)}>−</button>
      <span className="w-8 text-center font-semibold" aria-live="polite">{shown}</span>
      <button type="button" aria-label="Increase quantity" className={btn} disabled={pending || unavailable || shown >= max} onClick={() => change(shown + 1)}>+</button>
    </div>
  );
}
