-- 1. Public API can only read safe product columns (no purchase_cost_npr)
revoke select on products from anon, authenticated;
grant select (id, category_id, brand, name, slug, description, denomination_label,
              denomination_value, denomination_currency, selling_price_npr, image_path,
              low_stock_threshold, is_active, is_archived, is_featured, created_at, updated_at)
  on products to anon, authenticated;

-- 2. Counts-only function (never returns codes)
create or replace function get_stock_counts()
returns table (product_id uuid, stock_count int, sold_count int)
language sql stable security definer set search_path = public as $$
  select p.id,
         (count(*) filter (where c.status = 'available'))::int,
         (count(*) filter (where c.status = 'sold'))::int
  from products p
  left join gift_card_codes c on c.product_id = p.id
  where p.is_active and not p.is_archived
  group by p.id;
$$;
revoke all on function get_stock_counts() from public;
grant execute on function get_stock_counts() to anon, authenticated, service_role;

-- 3. Recreate the view without SECURITY DEFINER
drop view if exists products_public;
create view products_public with (security_invoker = true) as
select p.id, p.category_id, p.brand, p.name, p.slug, p.description, p.denomination_label,
       p.denomination_value, p.denomination_currency, p.selling_price_npr, p.image_path,
       p.is_featured, p.created_at,
       coalesce(s.stock_count, 0) as stock_count,
       case when coalesce(s.stock_count, 0) = 0 then 'out_of_stock'
            when coalesce(s.stock_count, 0) <= p.low_stock_threshold then 'low_stock'
            else 'in_stock' end as stock_status,
       coalesce(s.sold_count, 0) as sold_count
from products p
left join get_stock_counts() s on s.product_id = p.id
where p.is_active and not p.is_archived;
grant select on products_public to anon, authenticated;