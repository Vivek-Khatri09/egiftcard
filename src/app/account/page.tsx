import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNpr } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/account/StatusPill";

export const metadata = { title: "My account" };

export default async function AccountOverview() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const [{ data: details }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email, created_at").eq("id", user.id).single(),
    supabase.from("orders").select("id, order_number, status, total_npr, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
  ]);

  const rows = [
    { label: "Name", value: details?.full_name ?? profile.full_name ?? "—" },
    { label: "Email", value: details?.email ?? user.email ?? "—" },
    { label: "Phone", value: details?.phone ?? "—" },
    { label: "Member since", value: details?.created_at ? new Date(details.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Hello, {(profile.full_name ?? "there").split(" ")[0]}</h1>
        <p className="mt-1 text-ink-soft">Here is an overview of your account.</p>
      </div>

      <section className="card p-6" aria-labelledby="details">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="details" className="font-semibold">Account details</h2>
          <Link href="/account/profile" className="text-sm font-semibold text-brand-700 hover:underline">Edit</Link>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{r.label}</dt>
              <dd className="mt-0.5 break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent" className="font-semibold">Recent orders</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
        </div>
        {!orders || orders.length === 0 ? (
          <EmptyState title="No orders yet" text="When you buy a gift card, it will show up here." action={<Link href="/#products" className="btn-primary">Browse gift cards</Link>} />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:shadow-lift">
                  <span>
                    <span className="block font-semibold">{o.order_number}</span>
                    <span className="text-xs text-ink-soft">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </span>
                  <span className="flex items-center gap-3"><span className="font-semibold">{formatNpr(Number(o.total_npr))}</span><StatusPill status={o.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
