-- Row Level Security. Default deny: RLS enabled everywhere, only explicit policies grant access.
-- The service role (server only) bypasses RLS and is used for payments, fulfilment and admin writes.

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table code_import_batches enable row level security;
alter table gift_card_codes enable row level security;
alter table inventory_events enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table coupon_redemptions enable row level security;
alter table payments enable row level security;
alter table email_deliveries enable row level security;
alter table reviews enable row level security;
alter table contact_submissions enable row level security;
alter table support_requests enable row level security;
alter table site_settings enable row level security;
alter table audit_logs enable row level security;

-- ---- profiles: users read/update own basic fields; role can NEVER be changed from the client ----
create policy profiles_select_own on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from anon, authenticated;
grant update (full_name, phone) on profiles to authenticated;

-- ---- catalogue: public read of active items; writes go through the server (service role) ----
create policy categories_public_read on categories for select using (is_active or is_admin());
create policy products_public_read on products for select using ((is_active and not is_archived) or is_staff_or_admin());

-- Public-safe stock view: exposes COUNTS only, never codes. Runs with owner rights so it can count private rows.
create view products_public as
select p.id, p.category_id, p.brand, p.name, p.slug, p.description, p.denomination_label,
       p.denomination_value, p.denomination_currency, p.selling_price_npr, p.image_path,
       p.is_featured, p.created_at,
       coalesce(s.stock_count, 0)::int as stock_count,
       case when coalesce(s.stock_count,0) = 0 then 'out_of_stock'
            when coalesce(s.stock_count,0) <= p.low_stock_threshold then 'low_stock'
            else 'in_stock' end as stock_status,
       coalesce(sold.sold_count, 0)::int as sold_count
from products p
left join (select product_id, count(*) as stock_count from gift_card_codes where status = 'available' group by product_id) s on s.product_id = p.id
left join (select product_id, count(*) as sold_count from gift_card_codes where status = 'sold' group by product_id) sold on sold.product_id = p.id
where p.is_active and not p.is_archived;
grant select on products_public to anon, authenticated;

-- ---- gift card codes: NO public access. Owners may read only codes of their own sold orders. ----
revoke all on gift_card_codes from anon, authenticated;
grant select (id, product_id, code, pin, status, order_id, sold_at) on gift_card_codes to authenticated;
create policy codes_owner_read on gift_card_codes for select to authenticated
  using (status = 'sold' and exists (select 1 from orders o where o.id = gift_card_codes.order_id and o.user_id = auth.uid() and o.fulfillment_status in ('allocated','delivered')));
create policy codes_admin_read on gift_card_codes for select to authenticated using (is_admin());

create policy batches_admin on code_import_batches for select to authenticated using (is_staff_or_admin());
create policy inventory_events_admin on inventory_events for select to authenticated using (is_staff_or_admin());

-- ---- carts ----
create policy carts_own on carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_own on cart_items for all to authenticated
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ---- coupons: validated server-side only; admins may read ----
create policy coupons_admin_read on coupons for select to authenticated using (is_staff_or_admin());

-- ---- orders / items / payments: customers read their own; all writes are server-side ----
create policy orders_own_read on orders for select to authenticated using (user_id = auth.uid() or is_staff_or_admin());
create policy order_items_own_read on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_admin())));
create policy payments_own_read on payments for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_admin())));
create policy redemptions_admin_read on coupon_redemptions for select to authenticated using (is_staff_or_admin());
create policy email_deliveries_admin_read on email_deliveries for select to authenticated using (is_staff_or_admin());

-- ---- reviews: public reads approved; authors insert only for their own COMPLETED orders ----
create policy reviews_public_read on reviews for select using (is_approved or user_id = auth.uid() or is_staff_or_admin());
create policy reviews_insert_verified on reviews for insert to authenticated
  with check (user_id = auth.uid() and is_approved = false and exists (
    select 1 from orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'completed'));

-- ---- contact / support ----
create policy contact_public_insert on contact_submissions for insert to anon, authenticated with check (status = 'new');
create policy contact_admin_read on contact_submissions for select to authenticated using (is_staff_or_admin());
create policy support_own_insert on support_requests for insert to authenticated with check (user_id = auth.uid() and status = 'new');
create policy support_own_read on support_requests for select to authenticated using (user_id = auth.uid() or is_staff_or_admin());

-- ---- settings: contact info is public, bank details only for logged-in customers via server; admin full read ----
create policy settings_public_contact on site_settings for select using (key = 'contact' or is_staff_or_admin());

-- ---- audit logs: admin read only; insert via service role; never updatable (trigger) ----
create policy audit_admin_read on audit_logs for select to authenticated using (is_admin());
