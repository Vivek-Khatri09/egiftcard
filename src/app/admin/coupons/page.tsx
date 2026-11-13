import { createAdminClient } from "@/lib/supabase/admin";
import { toggleCoupon } from "@/app/actions/admin-coupons";
import CouponForm, { blankCoupon, type CouponValues } from "@/components/admin/CouponForm";

export const metadata = { title: "Coupons" };

type Row = {
  id: string; code: string; discount_type: string; discount_value: number; max_discount_npr: number | null; min_purchase_npr: number;
  usage_limit: number | null; used_count: number; expires_at: string | null; is_active: boolean;
};

const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;
const toNepalLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + NPT_OFFSET_MS).toISOString().slice(0, 16) : "");

export default async function AdminCoupons() {
  const { data } = await createAdminClient().from("coupons").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Coupons</h1>
      <section className="card p-6" aria-labelledby="new">
        <h2 id="new" className="mb-4 font-semibold">New coupon</h2>
        <CouponForm initial={blankCoupon} />
      </section>

      <ul className="space-y-4">
        {rows.map((c) => {
          const initial: CouponValues = {
            id: c.id, code: c.code, discountType: c.discount_type, discountValue: String(c.discount_value),
            maxDiscount: c.max_discount_npr == null ? "" : String(c.max_discount_npr), minPurchase: String(c.min_purchase_npr),
            usageLimit: c.usage_limit == null ? "" : String(c.usage_limit), expiresAt: toNepalLocal(c.expires_at), isActive: c.is_active,
          };
          return (
            <li key={c.id} className="card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{c.code} <span className="ml-2 text-sm font-normal text-ink-soft">used {c.used_count}{c.usage_limit != null ? ` of ${c.usage_limit}` : ""} times</span></p>
                <form action={toggleCoupon}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="activate" value={c.is_active ? "0" : "1"} />
                  <button type="submit" className={`text-sm font-semibold ${c.is_active ? "text-ink-soft hover:text-rose-700" : "text-emerald-700"}`}>{c.is_active ? "Disable" : "Enable"}</button>
                </form>
              </div>
              <CouponForm initial={initial} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
