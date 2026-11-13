-- Secure, atomic, idempotent code allocation. Callable ONLY by the service role (server).
create or replace function allocate_order_codes(p_order_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  item record;
  v_have int;
  v_need int;
  v_got int;
  v_total int := 0;
begin
  select * into o from orders where id = p_order_id for update;      -- serialise per order
  if not found then raise exception 'order % not found', p_order_id; end if;

  if o.fulfillment_status in ('allocated','delivered') then return 0; end if;   -- idempotent

  if not exists (select 1 from payments where order_id = p_order_id and status = 'paid') then
    raise exception 'order % has no verified payment', p_order_id;              -- never allocate before payment
  end if;

  for item in select * from order_items where order_id = p_order_id loop
    select count(*) into v_have from gift_card_codes where order_item_id = item.id;
    v_need := item.quantity - v_have;
    continue when v_need <= 0;

    with picked as (
      select id from gift_card_codes
      where product_id = item.product_id and status = 'available'
      order by created_at, id
      limit v_need
      for update skip locked                                                     -- concurrent buyers never get the same code
    )
    update gift_card_codes c
       set status = 'sold', order_id = p_order_id, order_item_id = item.id, sold_at = now()
      from picked where c.id = picked.id;
    get diagnostics v_got = row_count;

    if v_got < v_need then
      raise exception 'insufficient stock for product % (needed %, got %)', item.product_id, v_need, v_got;
      -- raising rolls back every allocation in this call: all-or-nothing
    end if;

    insert into inventory_events (product_id, order_id, event_type, quantity, note)
    values (item.product_id, p_order_id, 'sold', v_got, 'allocated to order');
    v_total := v_total + v_got;
  end loop;

  update orders set fulfillment_status = 'allocated', status = 'processing' where id = p_order_id;
  return v_total;
end $$;

revoke all on function allocate_order_codes(uuid) from public, anon, authenticated;
grant execute on function allocate_order_codes(uuid) to service_role;

-- Atomic coupon consumption (prevents overuse under concurrency). Service role only.
create or replace function consume_coupon(p_coupon_id uuid, p_order_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update coupons set used_count = used_count + 1
   where id = p_coupon_id and is_active
     and (expires_at is null or expires_at > now())
     and (usage_limit is null or used_count < usage_limit);
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  insert into coupon_redemptions (coupon_id, order_id, user_id) values (p_coupon_id, p_order_id, p_user_id);
  return true;
end $$;
revoke all on function consume_coupon(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function consume_coupon(uuid, uuid, uuid) to service_role;
