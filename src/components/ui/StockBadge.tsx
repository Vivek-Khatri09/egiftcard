import type { StockStatus } from "@/types";

const STYLES: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  in_stock: { label: "In Stock", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  low_stock: { label: "Low Stock", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  out_of_stock: { label: "Out of Stock", cls: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

export default function StockBadge({ status }: { status: StockStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
