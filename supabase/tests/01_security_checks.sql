-- Run in the Supabase SQL Editor. Every row must say PASS.
with checks(name, ok) as (values
  ('RLS is enabled on every public table',
     not exists (select 1 from pg_tables where schemaname = 'public' and not rowsecurity)),
  ('anon cannot read the gift_card_codes table',       not has_table_privilege('anon', 'public.gift_card_codes', 'select')),
  ('anon cannot read the code column',                 not has_column_privilege('anon', 'public.gift_card_codes', 'code', 'select')),
  ('authenticated users cannot read purchase cost',    not has_column_privilege('authenticated', 'public.products', 'purchase_cost_npr', 'select')),
  ('anon cannot read purchase cost',                   not has_column_privilege('anon', 'public.products', 'purchase_cost_npr', 'select')),
  ('users cannot change their own role',               not has_column_privilege('authenticated', 'public.profiles', 'role', 'update')),
  ('no public role can run the sensitive functions',
     not exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       cross join (values ('anon'), ('authenticated')) r(rolname)
       where n.nspname = 'public'
         and p.proname = any (array['allocate_order_codes','confirm_payment','create_checkout_order','release_order','expire_stale_orders',
                                    'validate_coupon','consume_coupon','submit_bank_transfer','reject_bank_payment','admin_stock_counts',
                                    'admin_sales_report','claim_email_delivery','rate_limit_hit'])
         and has_function_privilege(r.rolname, p.oid, 'execute'))),
  ('audit_logs cannot be changed (trigger present)',
     exists (select 1 from pg_trigger where tgrelid = 'public.audit_logs'::regclass and tgname = 'audit_logs_no_update'))
)
select name, case when ok then 'PASS' else 'FAIL' end as result from checks;
