# Test plan (Phase 8)

Tick each item. Anything that fails goes to the developer with the exact message or a screenshot.

## A. Automated checks (run on a TEST project, not on production once you have real customers)
| # | How | Expected |
|---|---|---|
| A1 | `npm run typecheck` and `npm run build` | no errors |
| A2 | SQL Editor: run `supabase/tests/01_security_checks.sql` | every row PASS |
| A3 | SQL Editor: run `supabase/tests/02_checkout_flow_test.sql` (whole block) | error "ALL TESTS PASSED (rolled back...)" |
| A4 | `node --env-file=.env.local scripts/concurrency-test.mjs` | all PASS; 4 of 12 simultaneous buyers succeed |
| A5 | `node --env-file=.env.local scripts/preflight.mjs` (before launch, with the PRODUCTION values) | all PASS |

## B. Authentication and authorization
- [ ] Register, verify email, log in, log out.
- [ ] Wrong password shows a generic error. 9 wrong attempts in 10 minutes shows "Too many attempts".
- [ ] Forgot password: link arrives, new password works, other sessions are signed out.
- [ ] Logged out: /account, /checkout, /cart and /admin all redirect to login.
- [ ] Normal customer opens /admin, /admin/orders, /api/admin/codes/template: sent away or 403.
- [ ] Customer A cannot open customer B's order: change the id in /account/orders/<id> to another customer's id: 404.
- [ ] A customer cannot reach codes of another order (Account > Gift cards shows only their own).
- [ ] Registering never creates an admin. Only the SQL promotion does.

## C. Payments (use the provider SANDBOX only)
- [ ] eSewa success: order completes, codes visible, stock drops by the quantity bought.
- [ ] eSewa cancel on the gateway page: order stays unpaid, can retry, no codes.
- [ ] Reload/revisit the success URL several times: still ONE delivery, no extra codes.
- [ ] Open /api/payments/esewa/success?data=garbage: redirected, nothing changes.
- [ ] Open /api/payments/khalti/return?pidx=fake: redirected, nothing changes.
- [ ] Khalti / bank transfer, if you offer them: same checks (bank: approve with the wrong amount is refused).
- [ ] Order left unpaid past the reservation time: cancelled, stock back on sale.
- [ ] Production deployment: sandbox payments are refused (checkout shows the method unavailable until live credentials are set).

## D. Duplicates and concurrency
- [ ] Excel upload containing a repeated code and a code already in stock: both reported as duplicates, only new ones imported.
- [ ] Add a code by hand that already exists: refused.
- [ ] Two browsers add the last item to the cart and check out together: one succeeds, the other sees "not enough stock".

## E. Email
- [ ] Order received, payment received and gift card emails arrive, once each.
- [ ] With SMTP broken, an order still completes; the failure appears in Admin > Emails; Retry sends it after fixing SMTP.
- [ ] "Email my codes again" works; stops after 6 sends.

## F. Excel upload edge cases
- [ ] Non-.xlsx file refused. Empty file refused. File over 4 MB refused. Wrong header (no "code" column) refused with a clear message.
- [ ] Blank rows ignored; codes shorter than 4 characters reported as invalid rows.

## G. Mobile and browsers
Check on a real phone (and a narrow desktop window) in Chrome and Safari:
- [ ] Menu opens/closes, all five sections reachable, active section highlights.
- [ ] Product filters usable, cards readable, cart quantity buttons easy to tap.
- [ ] Checkout, payment redirect and return work on the phone.
- [ ] Account pages and the order tracking bar read well. Admin tables scroll sideways instead of breaking the page.

## H. Policies and content
- [ ] No-refund notice visible on product pages, in the footer and at checkout (checkbox required).
- [ ] Policy pages reviewed by a qualified person; DRAFT banner removed.
- [ ] Contact details, About text and bank details are real (Admin > Settings), no leftover placeholders.
