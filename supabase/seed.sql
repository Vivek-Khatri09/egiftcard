-- Sample categories only. No fake inventory, no fake codes.
insert into categories (name, slug, sort_order) values
  ('Gaming', 'gaming', 1), ('Streaming', 'streaming', 2), ('Shopping', 'shopping', 3), ('Mobile & Apps', 'apps', 4)
on conflict do nothing;
