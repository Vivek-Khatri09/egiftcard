-- Product image uploads: restrict type and size at the storage layer (defence in depth).
update storage.buckets
   set file_size_limit = 1048576,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'product-images';

-- Stock counts for ALL products (including inactive/archived). Service role only (admin pages).
create or replace function admin_stock_counts()
returns table (product_id uuid, available int, sold int, voided int)
language sql stable security definer set search_path = public as $$
  select p.id,
         (count(*) filter (where c.status = 'available'))::int,
         (count(*) filter (where c.status = 'sold'))::int,
         (count(*) filter (where c.status = 'void'))::int
  from products p
  left join gift_card_codes c on c.product_id = p.id
  group by p.id;
$$;
revoke all on function admin_stock_counts() from public, anon, authenticated;
grant execute on function admin_stock_counts() to service_role;
