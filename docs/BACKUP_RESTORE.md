# Backups and restore

The database holds your gift card codes, orders and customers. Losing it would be serious, so do not rely on a single backup method.

## What Supabase provides (plan-dependent: CHECK YOUR PLAN)
Scheduled backups, retention length and Point-in-Time Recovery depend on the Supabase plan. Free projects may have NO downloadable backups.
Check Dashboard > Database > Backups and Supabase's current pricing page before launch. Do not assume your plan includes them.

## Manual backup (works on any plan)
Install the PostgreSQL client tools (`pg_dump`, `pg_restore`). Get the connection string in Dashboard > Connect (use the direct or session-pooler string with your database password).
```
pg_dump --no-owner --no-privileges -Fc -f egiftcard-YYYY-MM-DD.dump "<connection string>"
```
- Run it at least weekly (daily once real orders arrive) and keep copies off your computer (encrypted cloud storage).
- The file contains gift card codes and customer data: treat it like cash. Encrypt it and never email it.

## What a database dump does NOT contain
- **Storage files** (product images, bank-transfer proofs): download them from Dashboard > Storage, or script it with the Storage API.
- **Environment variables / keys**: keep a separate, secure record of every value in `.env.local` / Vercel.
- **Auth users** live in the `auth` schema. A plain dump of `public` alone will not recreate logins; a full-project restore from Supabase backups does.

## Restore
1. Create a NEW Supabase project (never restore over production without a second backup).
2. Re-apply the migrations in `supabase/migrations` in order (0001 to latest), or restore the dump:
   ```
   pg_restore --no-owner --clean --if-exists -d "<new connection string>" egiftcard-YYYY-MM-DD.dump
   ```
3. Re-upload storage files, set the environment variables, point the app at the new project.
4. Verify: log in as admin, open a recent order, reveal a code, check stock counts and the audit log.

## Test it
A backup you have never restored is a hope, not a backup. Restore into a scratch project once before launch and again after major changes.

## Audit log
`audit_logs` is append-only (database trigger) and is included in every dump. Keep at least one backup that predates any incident you may need to investigate.
