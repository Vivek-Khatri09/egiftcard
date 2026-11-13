import { createAdminClient } from "@/lib/supabase/admin";
import { moderateReview } from "@/app/actions/admin-reviews";
import StarRating from "@/components/ui/StarRating";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Reviews" };

type R = { id: string; rating: number; body: string; is_approved: boolean; created_at: string; profiles: { full_name: string | null; email: string | null } | null; products: { name: string } | null };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter = show === "approved" ? "approved" : show === "all" ? "all" : "pending";
  let q = createAdminClient().from("reviews").select("id, rating, body, is_approved, created_at, profiles(full_name, email), products(name)").order("created_at", { ascending: false }).limit(100);
  if (filter === "pending") q = q.eq("is_approved", false);
  if (filter === "approved") q = q.eq("is_approved", true);
  const { data } = await q;
  const rows = (data ?? []) as unknown as R[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Reviews</h1>
        <div className="flex gap-2">
          {[["pending", "Awaiting approval"], ["approved", "Published"], ["all", "All"]].map(([k, label]) => (
            <a key={k} href={`/admin/reviews?show=${k}`} aria-current={filter === k ? "true" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === k ? "bg-ink text-white" : "bg-white text-ink-soft hover:text-brand-700"}`}>{label}</a>
          ))}
        </div>
      </div>
      <p className="text-sm text-ink-soft">Only customers with a completed order can submit a review. Reviews appear on the store after you approve them.</p>
      {rows.length === 0 ? <EmptyState title="No reviews here" /> : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRating rating={r.rating} />
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.is_approved ? "Published" : "Awaiting approval"}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-ink-soft">{r.body}</p>
              <p className="mt-3 text-xs text-ink-muted">{r.profiles?.full_name ?? "Customer"} ({r.profiles?.email}) · {r.products?.name ?? "—"} · {new Date(r.created_at).toLocaleDateString("en-GB")}</p>
              <form action={moderateReview} className="mt-3 flex gap-4 text-sm font-semibold">
                <input type="hidden" name="id" value={r.id} />
                {r.is_approved ? <button name="action" value="hide" className="text-ink-soft hover:text-amber-700">Unpublish</button> : <button name="action" value="approve" className="text-emerald-700 hover:underline">Approve</button>}
                <button name="action" value="delete" className="text-ink-soft hover:text-rose-700">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
