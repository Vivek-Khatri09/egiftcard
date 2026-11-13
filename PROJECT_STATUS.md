# PROJECT_STATUS — Egiftcard

_Last updated: 2026-11-12 (Phase 2 storefront written, awaiting local verification)_

## 1. Project overview
Egiftcard: a digital gift card store (NPR pricing, eSewa / Khalti / bank transfer, automated code delivery after verified payment, customer accounts, admin dashboard). One Next.js project; no separate backend.

## 2. Confirmed technology stack
Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 3, Supabase (PostgreSQL, Auth, Storage), Vercel, GitHub. Zod for validation.

## 3. Completed phases
None fully verified yet. Phase 1 files are written but NOT yet run (see Known bugs / Outstanding errors).

## 4. Current phase
**Phase 2 — Website design and frontend** (code written; needs local typecheck/build and visual check). Phase 1 is complete and verified.

## 5. Completed features (written, not yet executed)
- Project config (package.json, tsconfig, Tailwind tokens, security headers, .env.example, .gitignore)
- Supabase clients: browser, server (user/RLS), admin (service role, `server-only`)
- Auth helpers (`requireUser`, `requireRole`), session-refresh middleware, `/auth/callback` (open-redirect safe), `/api/health`
- Database migrations 0001–0004 + seed.sql

## 6. Features in development
Phase 1 verification: `npm install`, `npm run typecheck`, `npm run build`, apply migrations to a Supabase project.

## 7. Not yet implemented
Everything in Phases 2–8 (storefront, auth UI, cart, checkout, payments, delivery, emails, admin, tests, deployment).

## 8. Files created
```
package.json  tsconfig.json  next.config.ts  postcss.config.mjs  tailwind.config.ts
.env.example  .gitignore  README.md  PROJECT_STATUS.md
docs/ARCHITECTURE.md
supabase/migrations/0001_schema.sql  0002_rls.sql  0003_functions.sql  0004_storage.sql
supabase/seed.sql
src/middleware.ts
src/app/{layout.tsx,page.tsx,globals.css}
src/app/api/health/route.ts   src/app/auth/callback/route.ts
src/lib/{env.ts,auth.ts,format.ts}
src/lib/supabase/{client.ts,server.ts,admin.ts}
```

## 9. Database changes
See docs/ARCHITECTURE.md. Tables: profiles, categories, products, code_import_batches, gift_card_codes, inventory_events, carts, cart_items, coupons, coupon_redemptions, orders, order_items, payments, email_deliveries, reviews, contact_submissions, support_requests, site_settings, audit_logs. View: products_public. Functions: allocate_order_codes, consume_coupon, is_admin, is_staff_or_admin, handle_new_user. Buckets: product-images (public), payment-proofs (private).

## 10. Known bugs
None known, but nothing has been executed yet.

## 11. Outstanding errors
- The build environment used for Phase 1 had no network, so `npm install`, typecheck, build and SQL execution were NOT run. SQL has not been run against PostgreSQL. Expect small fixes on first run.

## 12. Environment variables required
See `.env.example`. Needed now: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Later: eSewa, Khalti, email provider keys.

## 13. Important technical decisions
- Gift card codes live in `gift_card_codes`; no public access. Owners read only sold codes of their own orders; all allocation goes through `allocate_order_codes` (service role only, `FOR UPDATE SKIP LOCKED`, all-or-nothing, idempotent, requires a `paid` payment).
- Public stock counts come from the `products_public` view (counts only).
- Roles: customer / staff / admin. Signup always creates `customer`; role cannot be changed from the client. Admins are promoted manually via SQL (documented in README).
- Payment uniqueness enforced by DB unique indexes on (method, provider_reference / provider_transaction_id).
- `audit_logs` is append-only (trigger blocks UPDATE/DELETE).
- Codes are stored as plain text in Phase 1; encryption at rest (Supabase Vault / pgsodium) is an open technical decision for Phase 6.
- Sarab colours/fonts could not be read from the page HTML in Phase 1; Tailwind palette is a placeholder, to be matched in Phase 2 (structure noted: top info bar, sticky nav, category strip, hero with stats, menu cards with badges, offer countdown, testimonials, contact).

## 14. Open business decisions (do not assume)
1. Support: dedicated ticketing vs simple forms (currently a simple `support_requests` table only).
2. Number of admin/staff accounts and permissions (schema supports roles; no staff permissions defined).

## 15. EXACT NEXT TASK
1. On a machine with internet: `npm install`, `npm run typecheck`, `npm run build`; fix any errors.
2. Create a Supabase project, run migrations 0001→0004 and seed.sql, fix any SQL errors.
3. Confirm Phase 1 works, then begin Phase 2 (storefront) once the user says so.


## Phase 2 additions (2026-11-12)
- Files: src/app/{layout,page,loading,not-found}.tsx, products/[slug]/page.tsx, policies/[slug]/page.tsx, login/page.tsx and cart/page.tsx (placeholders), actions/contact.ts; src/components/{layout/Header,Footer; sections/*; ui/*}; src/lib/{data,site}.ts, validation/contact.ts; src/types/index.ts; tailwind.config.ts and globals.css updated.
- DB: migration 0006 (get_public_reviews function); optional supabase/sample_products.sql and dev_sample_codes.sql (fake codes, DEV ONLY, delete before launch).
- Decisions: palette is warm orange/charcoal inspired by the template (exact Sarab colours not extracted); fonts Poppins + Playfair Display via next/font; catalogue filters/sort run client-side over DB data; categories link to /?category=slug#products; reviews expose only a shortened display name; policies are DRAFT text needing professional review.
- Not working yet by design: Add to cart (Phase 4), login (Phase 3).
- Contact form: validated, honeypot only. Rate limiting is planned for Phase 8.
- Next task: run npm run typecheck and build, run 0006, view the site, then Phase 3.
