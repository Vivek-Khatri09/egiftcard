import { createAdminClient } from "@/lib/supabase/admin";
import { formatNpr } from "@/lib/format";
import BankVerifyRow from "@/components/admin/BankVerifyRow";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Payments" };

type Pay = {
  id: string; amount_npr: number; provider_reference: string | null; proof_path: string | null; created_at: string; status: string; note: string | null;
  orders: { order_number: string; profiles: { full_name: string | null; email: string | null } | null } | null;
};

export default async function AdminPayments() {
  const db = createAdminClient();
  const select = "id, amount_npr, provider_reference, proof_path, created_at, status, note, orders(order_number, profiles(full_name, email))";
  const [{ data: pending }, { data: recent }, { data: attention }] = await Promise.all([
    db.from("payments").select(select).eq("method", "bank_transfer").eq("status", "pending_verification").order("created_at"),
    db.from("payments").select(select).eq("method", "bank_transfer").in("status", ["paid", "failed"]).order("created_at", { ascending: false }).limit(10),
    db.from("orders").select("id, order_number, total_npr").eq("needs_attention", true),
  ]);
  const list = (pending ?? []) as unknown as Pay[];
  const done = (recent ?? []) as unknown as Pay[];
  const flagged = (attention ?? []) as { id: string; order_number: string; total_npr: number }[];

  // Proofs are private: short-lived signed links, created on the server for admins only.
  const links = new Map<string, string>();
  await Promise.all(list.filter((p) => p.proof_path).map(async (p) => {
    const { data } = await db.storage.from("payment-proofs").createSignedUrl(p.proof_path as string, 600);
    if (data?.signedUrl) links.set(p.id, data.signedUrl);
  }));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">Payments</h1>

      {flagged.length > 0 && (
        <section className="rounded-card bg-amber-50 p-5" aria-labelledby="attn">
          <h2 id="attn" className="font-semibold text-amber-900">Paid but not delivered ({flagged.length})</h2>
          <p className="mt-1 text-sm text-amber-800">These orders were paid but the codes could not be allocated, usually because stock ran out. Add codes to the product, or contact the customer.</p>
          <ul className="mt-2 text-sm">{flagged.map((o) => <li key={o.id}>{o.order_number} · {formatNpr(Number(o.total_npr))}</li>)}</ul>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="pending">
        <h2 id="pending" className="font-semibold">Bank transfers waiting for verification</h2>
        {list.length === 0 ? <EmptyState title="Nothing to review" /> : list.map((p) => (
          <div key={p.id} className="card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.orders?.order_number} · {formatNpr(Number(p.amount_npr))}</p>
                <p className="text-sm text-ink-soft">{p.orders?.profiles?.full_name ?? "Customer"} · {p.orders?.profiles?.email}</p>
                <p className="text-sm text-ink-soft">Reference: <strong>{p.provider_reference}</strong> · {new Date(p.created_at).toLocaleString("en-GB")}</p>
              </div>
              {links.get(p.id) ? <a href={links.get(p.id)} target="_blank" rel="noopener noreferrer" className="btn-outline !py-2">View proof</a> : <span className="text-sm text-rose-700">Proof file missing</span>}
            </div>
            <BankVerifyRow paymentId={p.id} amount={Number(p.amount_npr)} />
          </div>
        ))}
      </section>

      <section className="card p-6" aria-labelledby="recent">
        <h2 id="recent" className="mb-3 font-semibold">Recently reviewed</h2>
        {done.length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : (
          <ul className="divide-y divide-ink/10 text-sm">
            {done.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{p.orders?.order_number} · {formatNpr(Number(p.amount_npr))}{p.note ? ` · ${p.note}` : ""}</span>
                <span className={p.status === "paid" ? "text-emerald-700" : "text-rose-700"}>{p.status === "paid" ? "Verified" : "Rejected"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
