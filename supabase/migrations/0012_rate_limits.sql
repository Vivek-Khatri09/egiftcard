-- Phase 8: simple, serverless-friendly rate limiting (fixed window per key). Service role only.
create table if not exists rate_limits (
  bucket text primary key,
  count int not null,
  expires_at timestamptz not null
);
alter table rate_limits enable row level security;   -- no policies: only the server can touch it

-- Records one hit. Returns TRUE while the caller is within the limit, FALSE once they exceed it.
create or replace function rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into rate_limits (bucket, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set count = case when rate_limits.expires_at < now() then 1 else rate_limits.count + 1 end,
        expires_at = case when rate_limits.expires_at < now() then now() + make_interval(secs => p_window_seconds) else rate_limits.expires_at end
  returning count into v_count;

  if random() < 0.02 then delete from rate_limits where expires_at < now() - interval '1 hour'; end if;  -- housekeeping
  return v_count <= p_max;
end $$;

revoke all on function rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int) to service_role;
