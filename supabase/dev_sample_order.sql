-- OPTIONAL, DEVELOPMENT ONLY. Creates ONE fake completed order for your test account so you can
-- preview the order history, tracking and code pages. Needs sample_products.sql and dev_sample_codes.sql first.
-- 1) Replace the email below with the email you registered with. 2) Run once.
do $$
declare
  v_email text := 'johncena09@gmail.com';
  u uuid; p uuid; o uuid;
begin
  select id into u from profiles where lower(email) = lower(v_email);
  if u is null then raise exception 'No profile found for %', v_email; end if;
  select id into p from products where slug = 'sample-steam-10';
  if p is null then raise exception 'Run sample_products.sql first'; end if;

  insert into orders (user_id, payment_method, subtotal_npr, total_npr)
    values (u, 'bank_transfer', 3000, 3000) returning id into o;
  insert into order_items (order_id, product_id, product_name, quantity, unit_price_npr, unit_cost_npr)
    values (o, p, 'Steam Gift Card $10', 2, 1500, 1300);
  insert into payments (order_id, method, status, amount_npr, provider_reference, verified_at)
    values (o, 'bank_transfer', 'paid', 3000, 'DEV-SAMPLE', now());

  perform allocate_order_codes(o);   -- uses the same secure function real orders will use
  update orders set status = 'completed', fulfillment_status = 'delivered' where id = o;
end $$;

-- Remove the fake order(s) and free the sample codes again (run these lines together):
-- create temp table dev_orders as select order_id from payments where provider_reference = 'DEV-SAMPLE';
-- update gift_card_codes set status='available', order_id=null, order_item_id=null, sold_at=null where order_id in (select order_id from dev_orders);
-- delete from order_items where order_id in (select order_id from dev_orders);
-- delete from payments where provider_reference = 'DEV-SAMPLE';
-- delete from orders where id in (select order_id from dev_orders);
