# Egiftcard Architecture (Phase 1)

## Architecture
Single Next.js App Router project. Server Components read data; Server Actions / Route Handlers perform writes. Supabase provides Postgres, Auth and Storage. Three Supabase clients: browser (anon, RLS), server (user session, RLS), admin (service role, server-only, used for payments, fulfilment, admin writes after an explicit role check).

Planned routes: `/` (single-page storefront), `/products/[slug]`, `/checkout`, `/login`, `/register`, `/account/*`, `/admin/*`, `/api/payments/{esewa,khalti}/*`, `/policies/*`.

## Schema relationships
- auth.users 1—1 profiles (role: customer | staff | admin)
- categories 1—N products (each denomination = one product)
- products 1—N gift_card_codes (status available | reserved | sold | void)
- profiles 1—1 carts 1—N cart_items N—1 products
- profiles 1—N orders 1—N order_items N—1 products
- orders 1—N payments (provider references unique per method)
- orders 1—N gift_card_codes (assigned at allocation)
- coupons 1—N orders (via coupon_redemptions, one per order)
- orders 1—N reviews (only for completed orders), products 1—N reviews
- email_deliveries unique per (order, template) for safe retry
- contact_submissions, support_requests, site_settings, audit_logs (append-only), inventory_events

## Order lifecycle
Order `pending_payment` → payment record created → provider verified server-side (or admin verifies bank proof) → payment `paid` → `allocate_order_codes()` → order `processing`/fulfilment `allocated` → email sent → fulfilment `delivered`, order `completed`. Failure at any step never marks the order completed.

## Security approach
1. RLS on every table; default deny.
2. Codes never in public queries; stock via counts-only view.
3. Roles enforced in the database (`is_admin()`) and again in server code (`requireRole`).
4. Signup trigger forces role `customer`; clients cannot update `role`.
5. Allocation inside one Postgres function: row lock on order, `SKIP LOCKED` on codes, all-or-nothing, idempotent, requires paid payment, callable only by service role.
6. Payments verified server-side against provider APIs; amounts and references checked; unique indexes block replays.
7. Private bucket for payment proofs, folder per user.
8. Security headers in next.config.ts; open-redirect protection in auth callback.
9. Still to do: rate limiting (Phase 5/8), upload validation (Phase 4/5), audit log writes (Phase 7).

## External accounts and credentials needed
- Supabase project (URL, anon key, service role key) — now
- GitHub repository — Phase 8 (or earlier)
- Vercel account — Phase 8
- eSewa merchant credentials (test: product code + secret key; production needs merchant approval) — Phase 5
- Khalti merchant account (test + live secret keys) — Phase 5
- Transactional email provider, e.g. Resend, plus a verified sending domain — Phase 6
- Supabase custom SMTP for auth emails (the default sender is heavily rate limited) — Phase 3
- Business details: address, email, phone, bank account — placeholders until supplied

## Backups (to be expanded in Phase 7)
Scheduled backups and point-in-time recovery depend on the Supabase plan; verify your plan before relying on them. Manual fallback: periodic `pg_dump` of the database.
