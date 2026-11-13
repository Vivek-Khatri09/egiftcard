# Email setup (Phase 6)

## 1. Store emails (order, payment, gift card delivery)
Set these in `.env.local` (and later in Vercel), then restart the server:
```
SMTP_HOST=smtp.gmail.com        # or your provider's SMTP host
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-character Gmail App Password>
EMAIL_FROM=Egiftcard <you@gmail.com>
```
Gmail needs 2-Step Verification on, then an App Password. Gmail is for TESTING only (low daily limits, spam risk).
For launch use a transactional service (e.g. Resend or Brevo) with a sender address on your own domain; only these values change.

## 2. Supabase sign-up and password-reset emails
Supabase sends these itself. Authentication > Emails > SMTP Settings > enable custom SMTP with the same host/port/user/password and sender.
Optional branded templates (Authentication > Emails > Templates): use `{{ .ConfirmationURL }}` for the button link.

## 3. What is sent
| Email | When |
|---|---|
| order_confirmation | order placed |
| payment_confirmation | payment verified |
| gift_card_delivery | codes allocated (contains the codes) |
| payment_rejected | admin rejects a bank transfer |
| order_cancelled | customer cancels |

## 4. Safety
- One email per order and template (database claim), never duplicated by retries or repeated callbacks.
- Failures are recorded in `email_deliveries`; codes always stay in the customer's account.
- Retry: Admin > Emails (Retry), the customer's "Email my codes again" button (max 6 sends), or the cron route.
- Cron (optional): call `GET /api/cron/email-retry` with header `Authorization: Bearer <CRON_SECRET>` every 10 minutes.
  Vercel Hobby cron runs at most once a day; use an external scheduler or Supabase pg_cron + pg_net for more frequent retries.
