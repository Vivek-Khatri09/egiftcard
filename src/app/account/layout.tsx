import { requireUser } from "@/lib/auth";
import AccountNav from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser(); // server-side gate in addition to middleware
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside><AccountNav /></aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
