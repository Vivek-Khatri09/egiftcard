import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { formatNpr } from "@/lib/format";
import { removeCartItem } from "@/app/actions/cart";
import QuantityControl from "@/components/cart/QuantityControl";
import ProductImage from "@/components/ui/ProductImage";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Shopping cart" };

const PROBLEM_TEXT = {
  unavailable: "This gift card is no longer available. Remove it to continue.",
  out_of_stock: "Out of stock. Remove it to continue.",
  insufficient_stock: "Not enough stock for this quantity. Reduce it to continue.",
} as const;

export default async function CartPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const cart = await getCart();
  if (!cart) redirect("/login?next=/cart");

  if (cart.lines.length === 0) {
    return (
      <div className="section max-w-3xl">
        <h1 className="font-display text-3xl font-bold">Shopping cart</h1>
        <div className="mt-6">
          <EmptyState title="Your cart is empty" text="Add a gift card to get started." action={<Link href="/#products" className="btn-primary">Browse gift cards</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h1 className="font-display text-3xl font-bold">Shopping cart</h1>
      {notice === "stock" && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">We lowered a quantity to match the stock available.</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-4">
          {cart.lines.map((l) => (
            <li key={l.itemId} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <div className="w-full shrink-0 overflow-hidden rounded-xl sm:w-44">
                <ProductImage brand={l.brand || "Gift card"} denomination={l.denomination || ""} imagePath={l.imagePath} alt={l.name} />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{l.brand}</p>
                  <p className="font-semibold">{l.slug ? <Link href={`/products/${l.slug}`} className="hover:text-brand-700">{l.name}</Link> : l.name}</p>
                  {l.problem ? <p role="alert" className="mt-1 text-sm text-rose-700">{PROBLEM_TEXT[l.problem]}</p> : <p className="text-sm text-ink-soft">{formatNpr(l.unitPrice)} each · {l.stockCount} available</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <QuantityControl itemId={l.itemId} quantity={l.quantity} max={l.stockCount} name={l.name} unavailable={l.problem === "unavailable"} />
                  <div className="flex items-center gap-4">
                    <p className="font-bold">{l.problem ? "—" : formatNpr(l.lineTotal)}</p>
                    <form action={removeCartItem}><input type="hidden" name="itemId" value={l.itemId} /><button type="submit" className="text-sm text-ink-soft hover:text-rose-700">Remove</button></form>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-3 p-6" aria-labelledby="summary">
          <h2 id="summary" className="font-semibold">Order summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd>{cart.itemCount}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatNpr(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="text-ink-soft">Coupons apply at checkout</dd></div>
            <div className="flex justify-between border-t border-ink/10 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatNpr(cart.subtotal)}</dd></div>
          </dl>
          {cart.hasProblems ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">Fix the items marked above before you continue.</p>
          ) : (
            <Link href="/checkout" className="btn-primary w-full">Proceed to checkout</Link>
          )}
          <p className="text-xs text-ink-muted">Stock is checked again at checkout. All digital gift card sales are final.</p>
        </aside>
      </div>
    </div>
  );
}
