import { requireRole } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin"); // server-side gate; every admin action and API route checks again
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[200px_1fr] lg:px-8">
      <aside>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">Admin</p>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
