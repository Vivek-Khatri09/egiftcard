-- Egiftcard schema (Phase 1). All money is NPR, stored as numeric(12,2).
create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type app_role as enum ('customer', 'staff', 'admin');
create type code_status as enum ('available', 'reserved', 'sold', 'void');
create type discount_type as enum ('percentage', 'fixed');
create type payment_method as enum ('esewa', 'khalti', 'bank_transfer');
create type payment_status as enum ('initiated', 'pending_verification', 'paid', 'failed', 'cancelled');
create type order_status as enum ('pending_payment', 'payment_verification', 'processing', 'completed', 'failed', 'cancelled');
create type fulfillment_status as enum ('not_started', 'allocated', 'delivered', 'failed');
create type email_status as enum ('pending', 'sent', 'failed');
create type submission_status as enum ('new', 'in_progress', 'resolved', 'spam');

-- ---------- Helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Profiles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- Every new auth user is ALWAYS a customer. Role is never read from signup metadata.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone, role)
  values (new.id, new.email,
          nullif(new.raw_user_meta_data->>'full_name',''),
          nullif(new.raw_user_meta_data->>'phone',''),
          'customer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function is_staff_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'));
$$;

-- ---------- Catalogue ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per denomination (e.g. "Steam $10" and "Steam $20" are separate products).
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  brand text not null,
  name text not null,
  slug text not null unique,
  description text,
  denomination_label text not null,              -- e.g. "$10"
  denomination_value numeric(12,2),              -- face value, informational only
  denomination_currency text,                    -- e.g. "USD"
  selling_price_npr numeric(12,2) not null check (selling_price_npr >= 0),
  purchase_cost_npr numeric(12,2) not null default 0 check (purchase_cost_npr >= 0),
  image_path text,
  low_stock_threshold int not null default 5,
  is_active boolean not null default true,
  is_archived boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products(category_id);
create trigger products_updated before update on products for each row execute function set_updated_at();

-- ---------- Gift card codes (PRIVATE) ----------
create table code_import_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  filename text,
  total_rows int not null default 0,
  imported_rows int not null default 0,
  duplicate_rows int not null default 0,
  invalid_rows int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table gift_card_codes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  code text not null,
  pin text,
  code_hash text not null unique,                -- sha256(normalised code); blocks duplicates globally
  cost_npr numeric(12,2) not null default 0,     -- acquisition cost snapshot for profit maths
  status code_status not null default 'available',
  order_id uuid,                                 -- FK added after orders exist
  order_item_id uuid,
  sold_at timestamptz,
  import_batch_id uuid references code_import_batches(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index codes_product_status_idx on gift_card_codes(product_id, status);
create index codes_order_idx on gift_card_codes(order_id);

create table inventory_events (
  id bigint generated always as identity primary key,
  product_id uuid not null references products(id),
  code_id uuid references gift_card_codes(id),
  order_id uuid,
  event_type text not null,                      -- added | imported | sold | voided
  quantity int not null default 1,
  actor_id uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Carts ----------
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity between 1 and 50),
  unique (cart_id, product_id)
);

-- ---------- Coupons ----------
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type discount_type not null,
  discount_value numeric(12,2) not null check (discount_value > 0),
  max_discount_npr numeric(12,2),
  min_purchase_npr numeric(12,2) not null default 0,
  usage_limit int,
  used_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100)
);
create trigger coupons_updated before update on coupons for each row execute function set_updated_at();

-- ---------- Orders ----------
create sequence order_number_seq start 1000;
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('EG-' || nextval('order_number_seq')),
  user_id uuid not null references profiles(id),
  status order_status not null default 'pending_payment',
  fulfillment_status fulfillment_status not null default 'not_started',
  payment_method payment_method not null,
  subtotal_npr numeric(12,2) not null,
  discount_npr numeric(12,2) not null default 0,
  total_npr numeric(12,2) not null check (total_npr >= 0),
  coupon_id uuid references coupons(id),
  accepted_no_refund_at timestamptz,             -- customer ticked the no-refund policy at checkout
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders(user_id, created_at desc);
create trigger orders_updated before update on orders for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,                    -- snapshots, so history survives product edits
  quantity int not null check (quantity > 0),
  unit_price_npr numeric(12,2) not null,
  unit_cost_npr numeric(12,2) not null default 0
);
create index order_items_order_idx on order_items(order_id);

alter table gift_card_codes
  add constraint codes_order_fk foreign key (order_id) references orders(id),
  add constraint codes_order_item_fk foreign key (order_item_id) references order_items(id);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id),
  order_id uuid not null unique references orders(id),
  user_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Payments ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  method payment_method not null,
  status payment_status not null default 'initiated',
  amount_npr numeric(12,2) not null,
  provider_reference text,                       -- eSewa transaction_uuid / Khalti pidx / bank reference
  provider_transaction_id text,                  -- provider's final transaction id
  fee_npr numeric(12,2) not null default 0,
  proof_path text,                               -- private storage path (bank transfer proof)
  raw_response jsonb,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Idempotency: one provider reference can only ever be recorded once per method.
create unique index payments_provider_ref_uniq on payments(method, provider_reference) where provider_reference is not null;
create unique index payments_provider_txn_uniq on payments(method, provider_transaction_id) where provider_transaction_id is not null;
create index payments_order_idx on payments(order_id);
create trigger payments_updated before update on payments for each row execute function set_updated_at();

-- ---------- Email log (safe retry) ----------
create table email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  user_id uuid references profiles(id),
  template text not null,
  status email_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, template)                    -- one delivery email per order/template
);

-- ---------- Reviews, contact, support ----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  order_id uuid not null references orders(id),
  product_id uuid references products(id),
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 5 and 1000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, order_id, product_id)
);
create table contact_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  description text not null check (char_length(description) between 10 and 2000),
  status submission_status not null default 'new',
  created_at timestamptz not null default now()
);
-- Simple support form records. A full ticketing workflow is an OPEN business decision.
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  order_id uuid references orders(id),
  category text not null check (category in ('payment','invalid_code','delivery','other')),
  description text not null check (char_length(description) between 10 and 2000),
  status submission_status not null default 'new',
  created_at timestamptz not null default now()
);

-- ---------- Settings & audit ----------
create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into site_settings (key, value) values
  ('contact', '{"address":"[Business address]","email":"[business@email]","phone":"[+977-XXXXXXXXXX]"}'),
  ('bank_account', '{"bank_name":"[Bank]","account_name":"[Account holder]","account_number":"[Account number]","branch":"[Branch]"}');

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create or replace function audit_logs_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger audit_logs_no_update before update or delete on audit_logs for each row execute function audit_logs_immutable();
