import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { formatNpr } from "@/lib/format";
import { enabledMethods } from "@/lib/payments/config";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart) redirect("/login?next=/checkout");
  if (cart.lines.length === 0 || cart.hasProblems) redirect("/cart");

  return (
    <div className="section">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm subtotal={cart.subtotal} available={enabledMethods()} />
        <aside className="card h-fit p-6" aria-labelledby="items">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="items" className="font-semibold">Your items</h2>
            <Link href="/cart" className="text-sm font-semibold text-brand-700 hover:underline">Edit</Link>
          </div>
          <ul className="divide-y divide-ink/10 text-sm">
            {cart.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between gap-3 py-2"><span>{l.name} × {l.quantity}</span><span>{formatNpr(l.lineTotal)}</span></li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
