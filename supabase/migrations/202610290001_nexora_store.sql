-- NEXORA store schema. Run in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_method as enum ('cod', 'bkash_manual', 'nagad_manual');
create type public.payment_status as enum ('unpaid', 'pending_verification', 'verified', 'rejected', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  brand text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sizes text[] not null default '{}',
  color text not null default '',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_category_idx on public.products(status, category_id);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', name || ' ' || brand || ' ' || sku));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(product_id, storage_path)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  option_name text not null default 'Size',
  option_value text not null,
  price_delta numeric(12,2) not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(product_id, option_name, option_value)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('NX-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10))),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  shipping_city text not null,
  notes text not null default '',
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_customer_id_idx on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  selected_option text not null default '',
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'unpaid',
  sender_phone text,
  transaction_reference text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payments_method_trx_unique on public.payments(method, transaction_reference)
  where transaction_reference is not null and transaction_reference <> '';

create table public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_change integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null,
  reference_order_id uuid references public.orders(id) on delete set null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order numeric(12,2) not null default 0 check (minimum_order >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image_path text,
  cta_label text not null default 'Shop now',
  cta_href text not null default '/#shop',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_history enable row level security;
alter table public.coupons enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;

create policy "profiles select own or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update to authenticated using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

create policy "public read active categories" on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy "admin manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read active products" on public.products for select to anon, authenticated using (status = 'active' or public.is_admin());
create policy "admin manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read product images" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "admin manage product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read active variants" on public.product_variants for select to anon, authenticated using (is_active or public.is_admin());
create policy "admin manage variants" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "customer read own orders or admin" on public.orders for select to authenticated using (customer_id = (select auth.uid()) or public.is_admin());
create policy "admin manage orders" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "customer read own order items or admin" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or public.is_admin())));
create policy "admin manage order items" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "customer read own payments or admin" on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or public.is_admin())));
create policy "admin manage payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage inventory history" on public.inventory_history for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read active coupons" on public.coupons for select to anon, authenticated using (is_active and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now()));
create policy "admin manage coupons" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read active banners" on public.banners for select to anon, authenticated using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "admin manage banners" on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read site settings" on public.site_settings for select to anon, authenticated using (key in ('storefront','shipping') or public.is_admin());
create policy "admin manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Deliberately no client INSERT policy on orders/order_items/payments: checkout must use the
-- server-side order API, which validates price, stock, and delivery before inserting.
-- Promote the first administrator manually after creating their Auth user:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
