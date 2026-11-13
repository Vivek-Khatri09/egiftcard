-- Phase 5: checkout, stock reservation, payment confirmation. All functions are service-role only.

alter table orders   add column if not exists expires_at timestamptz;
alter table orders   add column if not exists needs_attention boolean not null default false;  -- paid, but codes could not be allocated
alter table payments add column if not exists note text;

-- Editable reservation windows (a business setting; change the values in this row any time).
insert into site_settings (key, value) values
  ('checkout', '{"online_reservation_minutes": 30, "bank_transfer_reservation_hours": 24}')
on conflict (key) do nothing;

-- Proof uploads: private bucket, images or PDF, 5 MB max.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'payment-proofs';

-- ---------------------------------------------------------------------------------------------
-- Coupon validation: the single source of truth for both the preview and the real order.
-- ---------------------------------------------------------------------------------------------
create or replace function validate_coupon(p_code text, p_subtotal numeric)
returns table (coupon_id uuid, discount numeric, error text)
language plpgsql stable security definer set search_path = public as $$
declare c coupons%rowtype; d numeric;
begin
  select * into c from coupons where lower(code) = lower(trim(p_code));
  if not found or not c.is_active then
    return query select null::uuid, 0::numeric, 'This coupon code is not valid.'::text; return;
  end if;
  if c.expires_at is not null and c.expires_at <= now() then
    return query select null::uuid, 0::numeric, 'This coupon has expired.'::text; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select null::uuid, 0::numeric, 'This coupon has reached its usage limit.'::text; return;
  end if;
  if p_subtotal < c.min_purchase_npr then
    return query select null::uuid, 0::numeric, ('This coupon needs a minimum purchase of Rs. ' || c.min_purchase_npr)::text; return;
  end if;

  if c.discount_type = 'percentage' then
    d := round(p_subtotal * c.discount_value / 100, 2);
    if c.max_discount_npr is not null then d := least(d, c.max_discount_npr); end if;
  else
    d := c.discount_value;
  end if;
  if d >= p_subtotal then
    return query select null::uuid, 0::numeric, 'This coupon cannot cover the full order total.'::text; return;
  end if;
  return query select c.id, d, null::text;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Release an unpaid order: free its reserved codes, give the coupon back, cancel open payments.
-- ---------------------------------------------------------------------------------------------
create or replace function release_order(p_order_id uuid, p_new_status order_status default 'cancelled')
returns boolean
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; v_coupon uuid;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then return false; end if;
  if o.status not in ('pending_payment', 'payment_verification') then return false; end if;
  if exists (select 1 from payments where order_id = p_order_id and status = 'paid') then return false; end if;

  update gift_card_codes
     set status = 'available', order_id = null, order_item_id = null
   where order_id = p_order_id and status = 'reserved';

  select coupon_id into v_coupon from coupon_redemptions where order_id = p_order_id;
  if v_coupon is not null then
    update coupons set used_count = greatest(used_count - 1, 0) where id = v_coupon;
    delete from coupon_redemptions where order_id = p_order_id;
  end if;

  update payments set status = 'cancelled' where order_id = p_order_id and status in ('initiated', 'pending_verification');
  update orders set status = p_new_status where id = p_order_id;
  return true;
end $$;

-- Cancels unpaid orders whose reservation window has passed. Bank transfers awaiting admin review are never expired.
create or replace function expire_stale_orders()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select o.id from orders o
     where o.status = 'pending_payment' and o.expires_at is not null and o.expires_at < now()
       and not exists (select 1 from payments p where p.order_id = o.id and p.status in ('paid', 'pending_verification'))
  loop
    if release_order(r.id, 'cancelled') then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Create an order from the customer's cart. Prices and costs come from the database, never the browser.
-- Codes are RESERVED (not sold) so a paying customer can never find the stock gone.
-- ---------------------------------------------------------------------------------------------
create or replace function create_checkout_order(p_user_id uuid, p_method payment_method, p_coupon_code text, p_accepted_no_refund boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cart uuid; v_order uuid; v_item record; v_oi uuid; v_got int;
  v_subtotal numeric := 0; v_discount numeric := 0; v_coupon uuid; v_err text;
  v_cfg jsonb; v_expires timestamptz; v_cart_items int; v_order_items int := 0;
begin
  if not coalesce(p_accepted_no_refund, false) then raise exception 'policy_not_accepted'; end if;
  perform expire_stale_orders();

  select id into v_cart from carts where user_id = p_user_id for update;
  if v_cart is null then raise exception 'cart_empty'; end if;
  select count(*) into v_cart_items from cart_items where cart_id = v_cart;
  if v_cart_items = 0 then raise exception 'cart_empty'; end if;

  select value into v_cfg from site_settings where key = 'checkout';
  v_expires := now() + case
    when p_method = 'bank_transfer' then make_interval(hours => coalesce((v_cfg->>'bank_transfer_reservation_hours')::int, 24))
    else make_interval(mins => coalesce((v_cfg->>'online_reservation_minutes')::int, 30)) end;

  insert into orders (user_id, payment_method, subtotal_npr, total_npr, accepted_no_refund_at, expires_at)
  values (p_user_id, p_method, 0, 0, now(), v_expires) returning id into v_order;

  for v_item in
    select ci.product_id, ci.quantity, p.name, p.selling_price_npr, p.purchase_cost_npr
      from cart_items ci join products p on p.id = ci.product_id
     where ci.cart_id = v_cart and p.is_active and not p.is_archived
     order by ci.product_id
  loop
    insert into order_items (order_id, product_id, product_name, quantity, unit_price_npr, unit_cost_npr)
    values (v_order, v_item.product_id, v_item.name, v_item.quantity, v_item.selling_price_npr, v_item.purchase_cost_npr)
    returning id into v_oi;

    update gift_card_codes
       set status = 'reserved', order_id = v_order, order_item_id = v_oi
     where id in (
       select id from gift_card_codes
        where product_id = v_item.product_id and status = 'available'
        order by created_at, id
        limit v_item.quantity
        for update skip locked);
    get diagnostics v_got = row_count;
    if v_got < v_item.quantity then raise exception 'insufficient_stock:%', v_item.name; end if;

    v_subtotal := v_subtotal + v_item.selling_price_npr * v_item.quantity;
    v_order_items := v_order_items + 1;
  end loop;

  if v_order_items <> v_cart_items then raise exception 'unavailable_item'; end if;
  if v_subtotal <= 0 then raise exception 'cart_empty'; end if;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select vc.coupon_id, vc.discount, vc.error into v_coupon, v_discount, v_err from validate_coupon(p_coupon_code, v_subtotal) vc;
    if v_err is not null then raise exception 'coupon_invalid:%', v_err; end if;
    if not consume_coupon(v_coupon, v_order, p_user_id) then raise exception 'coupon_invalid:This coupon is no longer available.'; end if;
  end if;

  update orders
     set subtotal_npr = v_subtotal, discount_npr = v_discount, total_npr = v_subtotal - v_discount, coupon_id = v_coupon
   where id = v_order;
  delete from cart_items where cart_id = v_cart;
  return v_order;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Allocation, updated to promote this order's reserved codes (and top up if a reservation was released).
-- ---------------------------------------------------------------------------------------------
create or replace function allocate_order_codes(p_order_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; item record; v_have int; v_need int; v_got int; v_total int := 0;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'order % not found', p_order_id; end if;
  if o.fulfillment_status in ('allocated', 'delivered') then return 0; end if;          -- idempotent
  if not exists (select 1 from payments where order_id = p_order_id and status = 'paid') then
    raise exception 'order % has no verified payment', p_order_id;                      -- never allocate before payment
  end if;

  for item in select * from order_items where order_id = p_order_id loop
    update gift_card_codes set status = 'sold', sold_at = now()
     where order_item_id = item.id and status = 'reserved';

    select count(*) into v_have from gift_card_codes where order_item_id = item.id and status = 'sold';
    v_need := item.quantity - v_have;

    if v_need > 0 then
      with picked as (
        select id from gift_card_codes
         where product_id = item.product_id and status = 'available'
         order by created_at, id
         limit v_need
         for update skip locked)
      update gift_card_codes c
         set status = 'sold', order_id = p_order_id, order_item_id = item.id, sold_at = now()
        from picked where c.id = picked.id;
      get diagnostics v_got = row_count;
      if v_got < v_need then
        raise exception 'insufficient stock for product % (needed %, got %)', item.product_id, v_need, v_got;  -- all-or-nothing
      end if;
    end if;

    insert into inventory_events (product_id, order_id, event_type, quantity, note)
    values (item.product_id, p_order_id, 'sold', item.quantity, 'allocated to order');
    v_total := v_total + item.quantity;
  end loop;

  update orders set fulfillment_status = 'allocated', status = 'processing' where id = p_order_id;
  return v_total;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Confirm a VERIFIED payment: idempotent, amount-checked, then allocate codes.
-- The caller must already have verified the payment with the provider (or an admin, for bank transfers).
-- ---------------------------------------------------------------------------------------------
create or replace function confirm_payment(p_payment_id uuid, p_amount numeric, p_provider_txn text, p_raw jsonb, p_verified_by uuid default null)
returns text
language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype; o orders%rowtype; v_result text;
begin
  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.status = 'paid' then return 'already_paid'; end if;               -- duplicate processing is a no-op
  if pay.amount_npr <> p_amount then raise exception 'amount_mismatch'; end if;

  select * into o from orders where id = pay.order_id for update;

  update payments
     set status = 'paid',
         provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id),
         raw_response = coalesce(p_raw, raw_response),
         verified_by = p_verified_by, verified_at = now()
   where id = p_payment_id;

  begin
    perform allocate_order_codes(pay.order_id);
    v_result := 'paid_allocated';
  exception when others then
    -- Money was verified but codes could not be allocated: never mark completed; flag for an admin.
    update orders set status = 'processing', fulfillment_status = 'failed', needs_attention = true where id = pay.order_id;
    v_result := 'paid_fulfilment_failed';
  end;
  return v_result;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Bank transfer: customer submits a reference and proof, admin verifies.
-- ---------------------------------------------------------------------------------------------
create or replace function submit_bank_transfer(p_order_id uuid, p_user_id uuid, p_reference text, p_proof_path text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; v_pay uuid;
begin
  select * into o from orders where id = p_order_id and user_id = p_user_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.payment_method <> 'bank_transfer' then raise exception 'wrong_method'; end if;
  if o.status <> 'pending_payment' then raise exception 'order_not_payable'; end if;

  insert into payments (order_id, method, status, amount_npr, provider_reference, proof_path)
  values (p_order_id, 'bank_transfer', 'pending_verification', o.total_npr, p_reference, p_proof_path)
  returning id into v_pay;
  update orders set status = 'payment_verification' where id = p_order_id;
  return v_pay;
end $$;

create or replace function reject_bank_payment(p_payment_id uuid, p_admin uuid, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype;
begin
  select * into pay from payments where id = p_payment_id for update;
  if not found or pay.method <> 'bank_transfer' or pay.status <> 'pending_verification' then raise exception 'not_reviewable'; end if;
  update payments
     set status = 'failed', verified_by = p_admin, verified_at = now(),
         note = left(coalesce(p_note, 'Rejected') || ' (ref ' || coalesce(pay.provider_reference, '-') || ')', 500),
         provider_reference = null                                   -- lets the customer resubmit the same reference
   where id = p_payment_id;
  update orders set status = 'pending_payment', expires_at = now() + interval '24 hours'
   where id = pay.order_id and status = 'payment_verification';
end $$;

-- Lock everything down: only the server (service role) may call these.
revoke all on function validate_coupon(text, numeric) from public, anon, authenticated;
revoke all on function release_order(uuid, order_status) from public, anon, authenticated;
revoke all on function expire_stale_orders() from public, anon, authenticated;
revoke all on function create_checkout_order(uuid, payment_method, text, boolean) from public, anon, authenticated;
revoke all on function allocate_order_codes(uuid) from public, anon, authenticated;
revoke all on function confirm_payment(uuid, numeric, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function submit_bank_transfer(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function reject_bank_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function validate_coupon(text, numeric) to service_role;
grant execute on function release_order(uuid, order_status) to service_role;
grant execute on function expire_stale_orders() to service_role;
grant execute on function create_checkout_order(uuid, payment_method, text, boolean) to service_role;
grant execute on function allocate_order_codes(uuid) to service_role;
grant execute on function confirm_payment(uuid, numeric, text, jsonb, uuid) to service_role;
grant execute on function submit_bank_transfer(uuid, uuid, text, text) to service_role;
grant execute on function reject_bank_payment(uuid, uuid, text) to service_role;
