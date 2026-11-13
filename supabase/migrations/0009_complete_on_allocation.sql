-- Once codes are allocated they are available in the customer's account, so the order is delivered and completed.
-- (The delivery email, added in Phase 6, is a separate step: if it fails, the codes stay and the email can be retried.)
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

  update orders set fulfillment_status = 'delivered', status = 'completed', needs_attention = false where id = p_order_id;
  return v_total;
end $$;

revoke all on function allocate_order_codes(uuid) from public, anon, authenticated;
grant execute on function allocate_order_codes(uuid) to service_role;

-- Fix orders that were already paid and allocated before this change.
update orders set status = 'completed', fulfillment_status = 'delivered'
 where status = 'processing' and fulfillment_status = 'allocated';
