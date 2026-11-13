import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/account/ProfileForm";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Profile</h1>
      <ProfileForm fullName={data?.full_name ?? ""} phone={data?.phone ?? ""} email={user.email ?? ""} />
    </div>
  );
}
