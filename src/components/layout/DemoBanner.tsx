/** Shown only when NEXT_PUBLIC_DEMO_MODE=true, so visitors know this is a demonstration store. */
export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs text-white sm:text-sm" role="note">
      Demo store: payments use eSewa&apos;s <strong>test sandbox</strong>. No real money is charged and no real gift cards are sold.
    </div>
  );
}
