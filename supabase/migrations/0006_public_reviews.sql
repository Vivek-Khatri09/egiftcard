-- Public-safe reviews: approved reviews with a shortened display name ("Anil K."), never email or user id.
create or replace function get_public_reviews(p_limit int default 12)
returns table (id uuid, rating int, body text, created_at timestamptz, display_name text, product_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.body, r.created_at,
         coalesce(nullif(split_part(trim(coalesce(pr.full_name, '')), ' ', 1), ''), 'Customer')
           || case when position(' ' in trim(coalesce(pr.full_name, ''))) > 0
                   then ' ' || upper(left(split_part(trim(pr.full_name), ' ', 2), 1)) || '.'
                   else '' end as display_name,
         p.name as product_name
  from reviews r
  join profiles pr on pr.id = r.user_id
  left join products p on p.id = r.product_id
  where r.is_approved
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function get_public_reviews(int) from public;
grant execute on function get_public_reviews(int) to anon, authenticated, service_role;
