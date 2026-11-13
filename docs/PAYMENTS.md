# Payments (Phase 5)

## Flow
Cart -> /checkout (method, coupon, no-refund acceptance) -> `create_checkout_order()` reserves the codes and snapshots prices
-> /checkout/pay/[orderId] -> gateway -> return URL -> **server asks the provider** -> `confirm_payment()` -> `allocate_order_codes()`.

The browser redirect is never trusted. eSewa: signature check + status API (with amount). Khalti: payment found by the pidx we stored, then lookup API (amount to the paisa).
`confirm_payment()` is idempotent (second call returns `already_paid`) and rejects amount mismatches. Unique indexes block reuse of a provider reference/transaction.

## Reservations
Unpaid orders reserve their codes for `online_reservation_minutes` (30) / `bank_transfer_reservation_hours` (24), editable in `site_settings` row `checkout`.
Expired orders are released by `expire_stale_orders()`: called on every checkout, and (optional) every 5 minutes via pg_cron:
```sql
create extension if not exists pg_cron;
select cron.schedule('expire-stale-orders', '*/5 * * * *', $$select public.expire_stale_orders()$$);
```
Bank transfers awaiting admin review never expire.

## Configuration
- eSewa test: works with the public sandbox credentials (product code EPAYTEST) with no env vars. Live: ESEWA_ENV=live, ESEWA_PRODUCT_CODE, ESEWA_SECRET_KEY.
- Khalti test: KHALTI_SECRET_KEY from test-admin.khalti.com. Live: KHALTI_ENV=live with the live secret key.
- NEXT_PUBLIC_SITE_URL must be the real site URL (used in return URLs).
- Bank details: edit `site_settings` row `bank_account` (bank_name, account_name, account_number, branch).

## Not verified against the real providers
Everything above was written from the providers' public documentation and has NOT been run against eSewa or Khalti. Treat each gateway as "built, untested" until a sandbox payment completes end to end.
