import { ORDER_STATUS_LABEL } from "@/lib/orders";

const STYLE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700",
  payment_verification: "bg-sky-50 text-sky-700",
  processing: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  cancelled: "bg-stone-100 text-stone-600",
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STYLE[status] ?? "bg-stone-100 text-stone-600"}`}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}
