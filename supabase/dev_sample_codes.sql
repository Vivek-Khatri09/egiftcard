-- OPTIONAL, DEVELOPMENT ONLY. Adds FAKE codes so stock badges can be previewed
-- (12 for the $10 cards = In Stock, 3 for the $20 cards = Low Stock, none for the rest).
-- These codes are not real. They MUST be deleted before launch.
insert into gift_card_codes (product_id, code, code_hash, cost_npr)
select p.id, 'SAMPLE-' || p.slug || '-' || g, md5('SAMPLE-' || p.slug || '-' || g), p.purchase_cost_npr
from products p
cross join generate_series(1, case when p.slug like '%-10' then 12 when p.slug like '%-20' then 3 else 0 end) g
where p.slug like 'sample-%'
on conflict (code_hash) do nothing;

-- Remove the fake codes (run before launch):
-- delete from gift_card_codes where code like 'SAMPLE-%' and status = 'available';
