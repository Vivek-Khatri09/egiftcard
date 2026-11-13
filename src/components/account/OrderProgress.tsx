import { orderProgress, PROGRESS_STEPS, paymentStepLabel } from "@/lib/orders";

export default function OrderProgress({ status, fulfillment }: { status: string; fulfillment: string }) {
  const { current, failed } = orderProgress(status, fulfillment);
  return (
    <div>
      {failed && (
        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {status === "cancelled" ? "This order was cancelled." : "This order failed. If you were charged, please contact us with your order number."}
        </p>
      )}
      <ol className="flex flex-col gap-4 sm:flex-row sm:gap-2" aria-label="Order progress">
        {PROGRESS_STEPS.map((label, i) => {
          const done = !failed && i < current;
          const active = !failed && i === current;
          const text = i === 1 && active ? paymentStepLabel(status) : label;
          return (
            <li key={label} className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center" aria-current={active ? "step" : undefined}>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white ring-4 ring-brand-100" : failed && i === 1 ? "bg-rose-500 text-white" : "bg-ink/10 text-ink-muted"
                }`}
              >
                {done ? "✓" : failed && i === 1 ? "!" : i + 1}
              </span>
              <span className={`text-xs font-medium ${done || active ? "text-ink" : "text-ink-muted"}`}>{text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
