import { createAdminClient } from "@/lib/supabase/admin";
import { setSubmissionStatus } from "@/app/actions/admin-contact";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Contact messages" };

const STATUSES = ["new", "in_progress", "resolved", "spam"];
type S = { id: string; full_name: string; email: string; phone: string | null; description: string; status: string; created_at: string };

export default async function AdminContact({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status! : "new";
  const { data } = await createAdminClient().from("contact_submissions").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as S[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Contact messages</h1>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => <a key={s} href={`/admin/contact?status=${s}`} aria-current={s === status ? "true" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${s === status ? "bg-ink text-white" : "bg-white text-ink-soft hover:text-brand-700"}`}>{s.replace("_", " ")}</a>)}
      </div>
      {rows.length === 0 ? <EmptyState title="Nothing here" /> : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-semibold">{m.full_name}</p><p className="text-sm text-ink-soft"><a href={`mailto:${m.email}`} className="text-brand-700 hover:underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</p></div>
                <span className="text-xs text-ink-muted">{new Date(m.created_at).toLocaleString("en-GB")}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{m.description}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                {STATUSES.filter((s) => s !== m.status).map((s) => (
                  <form key={s} action={setSubmissionStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={s} /><button type="submit" className="capitalize text-ink-soft hover:text-brand-700">Mark {s.replace("_", " ")}</button></form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
