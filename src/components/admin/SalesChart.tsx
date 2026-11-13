import { formatNpr } from "@/lib/format";

export type SeriesPoint = { bucket: string; revenue: number; cost: number; fees: number; expenses: number; orders: number };
export const profitOf = (p: SeriesPoint) => p.revenue - p.cost - p.fees - p.expenses;

export default function SalesChart({ series }: { series: SeriesPoint[] }) {
  if (series.length === 0) return null;
  const W = 760, H = 260, L = 56, R = 8, T = 12, B = 30;
  const maxV = Math.max(1, ...series.map((p) => Math.max(p.revenue, profitOf(p))));
  const minV = Math.min(0, ...series.map(profitOf));
  const y = (v: number) => T + ((maxV - v) / (maxV - minV)) * (H - T - B);
  const slot = (W - L - R) / series.length;
  const bw = Math.max(1.5, Math.min(18, slot * 0.38));
  const zero = y(0);
  const labelAt = new Set([0, Math.floor(series.length / 2), series.length - 1]);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue and profit over time">
        {[0, 0.5, 1].map((t) => {
          const v = minV + (maxV - minV) * (1 - t);
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.6}>{Math.round(v).toLocaleString("en-IN")}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={zero} y2={zero} stroke="currentColor" strokeOpacity={0.35} />
        {series.map((p, i) => {
          const cx = L + slot * i + slot / 2;
          const pr = profitOf(p);
          return (
            <g key={p.bucket}>
              <title>{`${p.bucket}: revenue ${formatNpr(p.revenue)}, profit ${formatNpr(pr)}, ${p.orders} orders`}</title>
              <rect x={cx - bw - 0.5} width={bw} y={Math.min(y(p.revenue), zero)} height={Math.abs(zero - y(p.revenue))} fill="#ea580c" rx={1} />
              <rect x={cx + 0.5} width={bw} y={Math.min(y(pr), zero)} height={Math.abs(zero - y(pr))} fill={pr >= 0 ? "#1c1917" : "#e11d48"} rx={1} />
              {labelAt.has(i) && <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity={0.7}>{p.bucket.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-600" /> Revenue</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-ink" /> Profit</span>
      </figcaption>
    </figure>
  );
}
