// Pre-launch checks. Run:  node --env-file=.env.local scripts/preflight.mjs
// Prints only variable NAMES and pass/fail, never secret values.
const env = process.env;
const results = [];
const check = (name, ok, hint) => results.push({ name, ok, hint });

const need = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "CRON_SECRET"];
for (const k of need) check(`${k} is set`, Boolean(env[k]), "Add it in Vercel > Settings > Environment Variables");

const site = env.NEXT_PUBLIC_SITE_URL ?? "";
check("Site URL is https and not localhost", site.startsWith("https://") && !site.includes("localhost"), "Use your real https domain in production");
check("Supabase URL looks right", /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.NEXT_PUBLIC_SUPABASE_URL ?? ""), "Should look like https://abcdxyz.supabase.co");
check("Service role key is NOT public", !("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" in env), "Never prefix the service role key with NEXT_PUBLIC_");

const methods = (env.PAYMENT_METHODS ?? "esewa,khalti,bank_transfer").split(",").map((s) => s.trim());
if (methods.includes("esewa")) {
  check("eSewa is in LIVE mode", env.ESEWA_ENV === "live", "Set ESEWA_ENV=live (sandbox payments are blocked on the production deployment)");
  check("eSewa live product code + secret set", Boolean(env.ESEWA_PRODUCT_CODE && env.ESEWA_SECRET_KEY), "Set ESEWA_PRODUCT_CODE and ESEWA_SECRET_KEY from your eSewa merchant account");
  check("eSewa is not using the public sandbox secret", env.ESEWA_SECRET_KEY !== "8gBm/:&EnhH.1/q", "That is the public TEST secret");
}
if (methods.includes("khalti")) {
  check("Khalti is in LIVE mode", env.KHALTI_ENV === "live", "Set KHALTI_ENV=live");
  check("Khalti live secret set", Boolean(env.KHALTI_SECRET_KEY), "Set KHALTI_SECRET_KEY from your Khalti merchant account");
}
check("CRON_SECRET is long enough", (env.CRON_SECRET ?? "").length >= 24, "Use a random string of 24+ characters");

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n      -> ${r.hint}`}`);
}
console.log(failed ? `\n${failed} check(s) failed. Fix them before launch.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
