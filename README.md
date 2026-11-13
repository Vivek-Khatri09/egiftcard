# Egiftcard

Digital gift card store built with Next.js, Supabase and Vercel. See `PROJECT_STATUS.md` for progress and `docs/ARCHITECTURE.md` for design.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. In the Supabase SQL editor (or `supabase db push`), run `supabase/migrations/0001` → `0004`, then `supabase/seed.sql`.
4. In Supabase Auth settings: enable email confirmations; add `http://localhost:3000/auth/callback` (and your Vercel URL) as redirect URLs.
5. `npm run dev`, then open http://localhost:3000 and http://localhost:3000/api/health.

## Creating the first admin
Self-registration can never create an admin. After registering normally, promote the account in the SQL editor:
```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

## Security notes
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. `src/lib/supabase/admin.ts` imports `server-only`.
- Never commit `.env*` files other than `.env.example`.
