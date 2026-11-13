import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section text-center">
      <p className="font-display text-5xl font-bold">404</p>
      <p className="mt-3 text-ink-soft">We couldn&apos;t find that page.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
