"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="section text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">We hit an unexpected problem. Your orders and codes are safe. Please try again.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
