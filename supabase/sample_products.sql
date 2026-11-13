-- OPTIONAL. Sample products so you can see the storefront layout. Prices and costs are placeholders.
-- They have NO codes, so they show "Out of Stock". Delete them before launch (see bottom).
insert into products (category_id, brand, name, slug, description, denomination_label, denomination_value,
                      denomination_currency, selling_price_npr, purchase_cost_npr, is_featured)
select c.id, v.brand, v.name, v.slug,
       'SAMPLE PRODUCT. Edit or delete this in the admin dashboard.', v.label, v.val, 'USD', v.price, v.cost, v.feat
from (values
  ('gaming',    'Steam',       'Steam Gift Card $10',       'sample-steam-10',       '$10', 10, 1500, 1300, true),
  ('gaming',    'Steam',       'Steam Gift Card $20',       'sample-steam-20',       '$20', 20, 2900, 2600, false),
  ('gaming',    'PlayStation', 'PlayStation Store $25',     'sample-playstation-25', '$25', 25, 3600, 3300, true),
  ('gaming',    'Xbox',        'Xbox Gift Card $10',        'sample-xbox-10',        '$10', 10, 1500, 1300, false),
  ('streaming', 'Netflix',     'Netflix Gift Card $15',     'sample-netflix-15',     '$15', 15, 2200, 1950, true),
  ('streaming', 'Spotify',     'Spotify Premium $10',       'sample-spotify-10',     '$10', 10, 1500, 1300, false),
  ('shopping',  'Amazon',      'Amazon Gift Card $25',      'sample-amazon-25',      '$25', 25, 3600, 3300, false),
  ('apps',      'Google Play', 'Google Play Gift Card $10', 'sample-googleplay-10',  '$10', 10, 1500, 1300, true)
) as v(cat, brand, name, slug, label, val, price, cost, feat)
join categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- Remove all samples (run before launch):
-- delete from products where slug like 'sample-%';
