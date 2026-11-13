-- Phase 6: safe, idempotent email delivery with retry. Service role only.
alter table email_deliveries add column if not exists locked_until timestamptz;
alter table email_deliveries add column if not exists last_attempt_at timestamptz;

-- Claims the right to send ONE email (per order + template). Returns the delivery id, or NULL when the email
-- was already sent, or another worker is sending it right now. This is what prevents duplicate emails.
create or replace function claim_email_delivery(p_order_id uuid, p_user_id uuid, p_template text, p_force boolean default false)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into email_deliveries (order_id, user_id, template, status)
  values (p_order_id, p_user_id, p_template, 'pending')
  on conflict (order_id, template) do nothing;

  update email_deliveries
     set locked_until = now() + interval '2 minutes', attempts = attempts + 1, last_attempt_at = now(), status = 'pending'
   where order_id = p_order_id and template = p_template
     and (status <> 'sent' or p_force)
     and (locked_until is null or locked_until < now())
  returning id into v_id;
  return v_id;
end $$;

revoke all on function claim_email_delivery(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function claim_email_delivery(uuid, uuid, text, boolean) to service_role;
