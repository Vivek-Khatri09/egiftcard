-- Run the WHOLE block in the Supabase SQL Editor. It creates temporary data and ends with an error on purpose,
-- so nothing is saved. Expected final message:  ALL TESTS PASSED (rolled back, nothing was saved)
-- Any message starting with TEST FAILED means something is wrong: send it to the developer.
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  c uuid; p uuid; cart1 uuid; cart2 uuid; o1 uuid; o2 uuid; o3 uuid; o4 uuid; pay1 uuid; pay2 uuid;
  n int; r text; used int; v_code text := 'TESTCOUPON' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into auth.users (id, email) values (u1, 't1-' || u1 || '@example.com'), (u2, 't2-' || u2 || '@example.com');
  insert into categories (name, slug) values ('T-' || u1, 't-' || u1) returning id into c;
  insert into products (category_id, brand, name, slug, denomination_label, selling_price_npr, purchase_cost_npr)
    values (c, 'Test', 'Flow Test', 'flow-' || u1, '$1', 1000, 800) returning id into p;
  insert into gift_card_codes (product_id, code, code_hash, cost_npr)
    select p, 'FLOW' || g, md5('FLOW' || g || u1::text), 800 from generate_series(1, 3) g;
  insert into carts (user_id) values (u1) returning id into cart1;
  insert into carts (user_id) values (u2) returning id into cart2;
  insert into cart_items (cart_id, product_id, quantity) values (cart1, p, 2), (cart2, p, 2);

  -- 1. Checkout reserves exactly the quantity, and empties the cart
  o1 := create_checkout_order(u1, 'esewa', null, true);
  select count(*) into n from gift_card_codes where product_id = p and status = 'reserved' and order_id = o1;
  if n <> 2 then raise exception 'TEST FAILED: expected 2 reserved codes, got %', n; end if;
  select count(*) into n from cart_items where cart_id = cart1;
  if n <> 0 then raise exception 'TEST FAILED: cart was not emptied'; end if;

  -- 2. Overselling is impossible: customer 2 wants 2 but only 1 is left; nothing is taken and the cart survives
  begin
    perform create_checkout_order(u2, 'esewa', null, true);
    raise exception 'TEST FAILED: oversold stock';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%insufficient_stock%' then raise exception 'TEST FAILED: wrong error: %', sqlerrm; end if;
  end;
  select count(*) into n from gift_card_codes where product_id = p and status = 'available';
  if n <> 1 then raise exception 'TEST FAILED: failed checkout changed stock (% available)', n; end if;
  select count(*) into n from cart_items where cart_id = cart2;
  if n <> 1 then raise exception 'TEST FAILED: failed checkout lost the cart'; end if;

  -- 3. The no-refund acceptance is required
  begin
    perform create_checkout_order(u1, 'esewa', null, false);
    raise exception 'TEST FAILED: order created without accepting the policy';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 4. A wrong amount is refused and nothing is delivered
  pay1 := gen_random_uuid();
  insert into payments (id, order_id, method, status, amount_npr, provider_reference) values (pay1, o1, 'esewa', 'initiated', 2000, pay1::text);
  begin
    perform confirm_payment(pay1, 1, 'TXN-T1', '{}'::jsonb);
    raise exception 'TEST FAILED: accepted a wrong amount';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
  select count(*) into n from gift_card_codes where order_id = o1 and status = 'sold';
  if n <> 0 then raise exception 'TEST FAILED: codes sold before payment was confirmed'; end if;

  -- 5. The correct amount delivers exactly 2 codes and completes the order
  r := confirm_payment(pay1, 2000, 'TXN-T1', '{}'::jsonb);
  if r <> 'paid_allocated' then raise exception 'TEST FAILED: expected paid_allocated, got %', r; end if;
  select count(*) into n from gift_card_codes where order_id = o1 and status = 'sold';
  if n <> 2 then raise exception 'TEST FAILED: expected 2 sold codes, got %', n; end if;
  if (select status from orders where id = o1) <> 'completed' then raise exception 'TEST FAILED: order not completed'; end if;

  -- 6. Duplicate processing does nothing
  r := confirm_payment(pay1, 2000, 'TXN-T1', '{}'::jsonb);
  if r <> 'already_paid' then raise exception 'TEST FAILED: duplicate confirm returned %', r; end if;
  select count(*) into n from gift_card_codes where product_id = p and status = 'sold';
  if n <> 2 then raise exception 'TEST FAILED: duplicate confirm changed sold count to %', n; end if;

  -- 7. The same provider transaction id cannot pay a second order
  update cart_items set quantity = 1 where cart_id = cart2;
  o2 := create_checkout_order(u2, 'esewa', null, true);
  pay2 := gen_random_uuid();
  insert into payments (id, order_id, method, status, amount_npr, provider_reference) values (pay2, o2, 'esewa', 'initiated', 1000, pay2::text);
  begin
    perform confirm_payment(pay2, 1000, 'TXN-T1', '{}'::jsonb);
    raise exception 'TEST FAILED: reused a transaction id';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
  r := confirm_payment(pay2, 1000, 'TXN-T2', '{}'::jsonb);
  if r <> 'paid_allocated' then raise exception 'TEST FAILED: second order expected paid_allocated, got %', r; end if;
  select count(*) into n from gift_card_codes where product_id = p and status = 'sold';
  if n <> 3 then raise exception 'TEST FAILED: expected 3 sold codes, got %', n; end if;

  -- 8. Coupons: discount applied, usage limit enforced, and returned when an order is released
  insert into gift_card_codes (product_id, code, code_hash, cost_npr)
    select p, 'FLOWB' || g, md5('FLOWB' || g || u1::text), 800 from generate_series(1, 3) g;
  insert into coupons (code, discount_type, discount_value, usage_limit) values (v_code, 'percentage', 10, 1);
  insert into cart_items (cart_id, product_id, quantity) values (cart1, p, 1);
  o3 := create_checkout_order(u1, 'esewa', v_code, true);
  if (select discount_npr from orders where id = o3) <> 100 or (select total_npr from orders where id = o3) <> 900 then
    raise exception 'TEST FAILED: wrong coupon maths';
  end if;
  select used_count into used from coupons where code = v_code;
  if used <> 1 then raise exception 'TEST FAILED: coupon use not counted'; end if;

  insert into cart_items (cart_id, product_id, quantity) values (cart2, p, 1);
  begin
    perform create_checkout_order(u2, 'esewa', v_code, true);
    raise exception 'TEST FAILED: coupon usage limit not enforced';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%coupon_invalid%' then raise exception 'TEST FAILED: wrong coupon error: %', sqlerrm; end if;
  end;

  if not release_order(o3, 'cancelled') then raise exception 'TEST FAILED: release_order did nothing'; end if;
  select used_count into used from coupons where code = v_code;
  if used <> 0 then raise exception 'TEST FAILED: coupon use not returned on release'; end if;
  select count(*) into n from gift_card_codes where product_id = p and status = 'reserved';
  if n <> 0 then raise exception 'TEST FAILED: released order kept reservations'; end if;
  if release_order(o1, 'cancelled') then raise exception 'TEST FAILED: a PAID order was released'; end if;

  -- 9. Expired unpaid orders are released
  o4 := create_checkout_order(u2, 'esewa', null, true);
  update orders set expires_at = now() - interval '1 minute' where id = o4;
  if expire_stale_orders() < 1 then raise exception 'TEST FAILED: nothing expired'; end if;
  if (select status from orders where id = o4) <> 'cancelled' then raise exception 'TEST FAILED: expired order not cancelled'; end if;

  raise exception 'ALL TESTS PASSED (rolled back, nothing was saved)';
end $$;
