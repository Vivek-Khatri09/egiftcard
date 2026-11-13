const ITEMS = [
  { title: "Verified payments", text: "Every payment is checked server-side before any code is released." },
  { title: "Automatic delivery", text: "Codes are emailed and saved in your account history." },
  { title: "Local payment options", text: "Pay with eSewa, Khalti or bank transfer." },
];

export default function TrustBar() {
  return (
    <div className="border-y border-ink/10 bg-white">
      <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
        {ITEMS.map((i) => (
          <li key={i.title} className="flex gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700" aria-hidden>
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current"><path d="M8.2 14.2L4.5 10.5l1.4-1.4 2.3 2.3 5.9-5.9 1.4 1.4-7.3 7.3z" /></svg>
            </span>
            <div>
              <p className="font-semibold">{i.title}</p>
              <p className="text-sm text-ink-soft">{i.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
