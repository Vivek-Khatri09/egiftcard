-- Storage buckets. Product images are public; payment proofs are private.
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Product images: anyone can read; only admins write.
create policy product_images_read on storage.objects for select using (bucket_id = 'product-images');
create policy product_images_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and is_admin()) with check (bucket_id = 'product-images' and is_admin());

-- Payment proofs: users may upload/read only inside their own folder (<user_id>/...); admins read all.
create policy proofs_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy proofs_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff_or_admin()));
