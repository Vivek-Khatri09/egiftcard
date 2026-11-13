import { createAdminClient } from "@/lib/supabase/admin";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings" };

const asStrings = (v: unknown): Record<string, string> => Object.fromEntries(Object.entries((v ?? {}) as Record<string, unknown>).map(([k, x]) => [k, String(x ?? "")]));

export default async function AdminSettings() {
  const { data } = await createAdminClient().from("site_settings").select("key, value");
  const s = new Map(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, asStrings(r.value)]));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <SettingsForm section="contact" title="Business contact details" intro="Shown on the Contact section and in emails. Replace the placeholders with your real details."
        fields={[{ name: "address", label: "Business location" }, { name: "email", label: "Business email", type: "email" }, { name: "phone", label: "Business phone" }]} initial={s.get("contact") ?? {}} />
      <SettingsForm section="bank_account" title="Bank account for transfers" intro="Only shown to a customer who chooses bank transfer."
        fields={[{ name: "bank_name", label: "Bank name" }, { name: "account_name", label: "Account holder" }, { name: "account_number", label: "Account number" }, { name: "branch", label: "Branch" }]} initial={s.get("bank_account") ?? {}} />
      <SettingsForm section="fees" title="Payment fees (% of order total)" intro="Used only for profit calculations. Enter what each provider actually charges you."
        fields={[{ name: "esewa_percent", label: "eSewa fee %", type: "number" }, { name: "khalti_percent", label: "Khalti fee %", type: "number" }, { name: "bank_transfer_percent", label: "Bank transfer fee %", type: "number" }]} initial={s.get("fees") ?? {}} />
      <SettingsForm section="checkout" title="Stock reservation time" intro="How long gift cards stay reserved for an unpaid order. Bank transfers awaiting your review never expire."
        fields={[{ name: "online_reservation_minutes", label: "eSewa / Khalti (minutes)", type: "number" }, { name: "bank_transfer_reservation_hours", label: "Bank transfer (hours)", type: "number" }]} initial={s.get("checkout") ?? {}} />
    </div>
  );
}
