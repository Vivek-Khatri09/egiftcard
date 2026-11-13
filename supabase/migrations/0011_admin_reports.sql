-- Phase 7: expenses, payment-fee settings and the sales/profit report. Admin (service role) only.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null default 'other',
  description text not null check (char_length(description) between 2 and 200),
  amount_npr numeric(12,2) not null check (amount_npr > 0),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table expenses enable row level security;   -- no policies: only the server (service role) can touch it

-- Payment processing fees as a percentage of the order total, per method. Set the real values in Admin > Settings.
insert into site_settings (key, value) values
  ('fees', '{"esewa_percent": 0, "khalti_percent": 0, "bank_transfer_percent": 0}')
on conflict (key) do nothing;

-- Sales report. "Successful sale" = an order with a verified (paid) payment, dated by when it was verified (Nepal time).
-- Revenue = order totals (already net of coupon discounts). Product cost = acquisition cost of the codes actually sold.
-- Profit = revenue - product cost - payment fees - expenses.
create or replace function admin_sales_report(p_from date, p_to date, p_group text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_fees jsonb; v_result jsonb; v_step interval;
begin
  if p_group not in ('day', 'week', 'month') then p_group := 'day'; end if;
  if p_to < p_from then raise exception 'invalid_range'; end if;
  if p_to - p_from > 1100 then raise exception 'range_too_large'; end if;
  v_step := ('1 ' || p_group)::interval;
  select value into v_fees from site_settings where key = 'fees';

  with paid as (
    select o.id, o.payment_method, o.total_npr, o.discount_npr,
           (min(p.verified_at) at time zone 'Asia/Kathmandu')::date as d
      from orders o join payments p on p.order_id = o.id and p.status = 'paid'
     group by o.id
    having (min(p.verified_at) at time zone 'Asia/Kathmandu')::date between p_from and p_to
  ),
  costs as (
    select c.order_id, sum(c.cost_npr) as cost
      from gift_card_codes c where c.status = 'sold' and c.order_id in (select id from paid) group by c.order_id
  ),
  per_order as (
    select pd.id, pd.d, pd.payment_method, pd.total_npr, pd.discount_npr,
           coalesce(co.cost, 0) as cost,
           round(pd.total_npr * coalesce((v_fees ->> (pd.payment_method::text || '_percent'))::numeric, 0) / 100, 2) as fee
      from paid pd left join costs co on co.order_id = pd.id
  ),
  exp as (select e.spent_on as d, e.amount_npr from expenses e where e.spent_on between p_from and p_to),
  buckets as (
    select generate_series(date_trunc(p_group, p_from::timestamp), date_trunc(p_group, p_to::timestamp), v_step)::date as b
  ),
  series as (
    select b.b as bucket,
           coalesce((select sum(po.total_npr) from per_order po where date_trunc(p_group, po.d::timestamp)::date = b.b), 0) as revenue,
           coalesce((select sum(po.cost) from per_order po where date_trunc(p_group, po.d::timestamp)::date = b.b), 0) as cost,
           coalesce((select sum(po.fee) from per_order po where date_trunc(p_group, po.d::timestamp)::date = b.b), 0) as fees,
           coalesce((select sum(x.amount_npr) from exp x where date_trunc(p_group, x.d::timestamp)::date = b.b), 0) as expenses,
           (select count(*) from per_order po where date_trunc(p_group, po.d::timestamp)::date = b.b) as orders
      from buckets b
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'revenue',      coalesce((select sum(total_npr) from per_order), 0),
      'product_cost', coalesce((select sum(cost) from per_order), 0),
      'payment_fees', coalesce((select sum(fee) from per_order), 0),
      'expenses',     coalesce((select sum(amount_npr) from exp), 0),
      'discounts',    coalesce((select sum(discount_npr) from per_order), 0),
      'orders',       (select count(*) from per_order)),
    'series', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'revenue', revenue, 'cost', cost, 'fees', fees, 'expenses', expenses, 'orders', orders) order by bucket) from series), '[]'::jsonb),
    'by_product', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue, 'cost', cost) order by qty desc) from (
        select oi.product_name as name, sum(oi.quantity) as qty, sum(oi.quantity * oi.unit_price_npr) as revenue, coalesce(sum(cc.cost), 0) as cost
          from order_items oi
          left join (select order_item_id, sum(cost_npr) as cost from gift_card_codes where status = 'sold' group by order_item_id) cc on cc.order_item_id = oi.id
         where oi.order_id in (select id from per_order)
         group by oi.product_name order by sum(oi.quantity) desc limit 10) t), '[]'::jsonb),
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', method, 'orders', orders, 'revenue', revenue)) from (
        select payment_method::text as method, count(*) as orders, sum(total_npr) as revenue from per_order group by payment_method) m), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

revoke all on function admin_sales_report(date, date, text) from public, anon, authenticated;
grant execute on function admin_sales_report(date, date, text) to service_role;
