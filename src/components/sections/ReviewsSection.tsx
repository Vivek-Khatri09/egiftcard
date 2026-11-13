import type { PublicReview } from "@/types";
import SectionHeading from "@/components/ui/SectionHeading";
import StarRating from "@/components/ui/StarRating";
import EmptyState from "@/components/ui/EmptyState";

function initials(name: string) {
  return name.split(" ").map((p) => p.charAt(0)).join("").slice(0, 2).toUpperCase();
}

export default function ReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  return (
    <div className="section">
      <SectionHeading eyebrow="Reviews" title="What customers say" subtitle="Reviews come from customers who completed a purchase and are checked by our team before they appear." />
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" text="Be the first. After your order is completed you can leave a verified-purchase review from your account." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card flex flex-col p-6">
              <StarRating rating={r.rating} />
              <blockquote className="mt-3 flex-1 text-ink-soft">{r.body}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700" aria-hidden>
                  {initials(r.display_name)}
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">{r.display_name}</span>
                  <span className="text-ink-soft">
                    Verified purchase{r.product_name ? ` · ${r.product_name}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
