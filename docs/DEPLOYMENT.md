# Deployment and launch checklist

## 1. GitHub
```
cd egiftcard
git init
git add .
git status          # make sure .env.local is NOT listed (it is in .gitignore)
git commit -m "Initial commit"
```
Create an empty PRIVATE repository on github.com, then:
```
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```
If a secret was ever committed, rotate it (do not just delete the file): service role key, SMTP password, payment secrets.

## 2. Supabase production settings
- Prefer a SEPARATE production project from your test one. Run every migration in `supabase/migrations` (0001 to latest) on it. Do NOT run `sample_products.sql`, `dev_sample_codes.sql` or `dev_sample_order.sql`.
- Run `supabase/tests/01_security_checks.sql` there: all PASS.
- Authentication > URL Configuration: Site URL = your https domain. Redirect URLs: `https://<domain>/auth/callback` and `https://<domain>/auth/reset`.
- Authentication > Providers > Email: Confirm email ON. Password minimum 8.
- Authentication > Emails > SMTP: your production SMTP (same as the store emails).
- Region: note it. Choose the Vercel function region closest to it (Project Settings > Functions > Region) to keep checkout fast.
- Backups: check your plan (see docs/BACKUP_RESTORE.md). Schedule manual dumps if the plan has none.
- Optional: enable `pg_cron` and schedule `select public.expire_stale_orders()` every 5 minutes (see docs/PAYMENTS.md).
- Create your admin: register on the live site, then in the SQL Editor `update profiles set role = 'admin' where email = '<you>';`.
- Fill Admin > Settings: contact details, bank details (if used), real payment fee percentages, reservation times.

## 3. Vercel
1. vercel.com > Add New > Project > import the GitHub repository. Framework: Next.js (auto).
2. Environment Variables (Production), names exactly:
   `NEXT_PUBLIC_SITE_URL` (https domain), `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CRON_SECRET`, `PAYMENT_METHODS`,
   and per method: eSewa `ESEWA_ENV=live`, `ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`; Khalti `KHALTI_ENV=live`, `KHALTI_SECRET_KEY`.
   Never tick "expose to browser" for the service role key.
3. Deploy. Add your domain under Settings > Domains and follow the DNS instructions.
4. Preview deployments use sandbox payments (safe). The PRODUCTION deployment refuses sandbox payments by design.

## 4. Before the first real customer
- [ ] `node --env-file=.env.local scripts/preflight.mjs` with production values: all PASS.
- [ ] Full test plan (docs/TEST_PLAN.md) run against the preview deployment with sandbox payments.
- [ ] Live eSewa (and Khalti) merchant accounts approved; one small REAL payment made and refunded/verified end to end.
- [ ] Sample products, fake codes, test users and test orders removed.
- [ ] Real products and real codes loaded; prices and costs correct.
- [ ] Policies reviewed by a qualified person; no-refund wording consistent with the law.
- [ ] Email sent from your own domain (SPF/DKIM set up with your email provider), test emails not landing in spam.
- [ ] Backup taken and a restore tested.
- [ ] Service role key and all passwords stored in a password manager, not in chat or email.

## 5. After launch
- Watch Admin > Payments ("Paid but not delivered"), Admin > Emails (failures) and the audit log daily at first.
- Keep every product stocked: a paid order with no stock needs manual handling.
- Rotate secrets if anyone who had them leaves.

## 6. Rolling back
Vercel > Deployments > pick the previous good deployment > Promote to Production. Database changes are not rolled back automatically: take a backup before every migration.

## Known limits
- Rate limiting is per client IP (or per user) using the database; it slows abuse but is not a full WAF. Consider Cloudflare or Vercel's firewall for heavier protection.
- No Content-Security-Policy beyond `frame-ancestors`/`object-src`/`base-uri`. A full CSP should be introduced in report-only mode first so it cannot break the payment redirects.
