-- Dedicated finance and growth records for NEXORA admin.
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','processing','completed','failed')),
  provider_reference text,
  admin_note text not null default '',
  requested_by uuid references auth.users(id) on delete set null,
  processed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists refund_requests_order_id_idx on public.refund_requests(order_id);
create index if not exists refund_requests_status_idx on public.refund_requests(status);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  transaction_type text not null check (transaction_type in ('payment','refund','adjustment')),
  provider text not null default '',
  provider_reference text,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payment_transactions_order_id_idx on public.payment_transactions(order_id);
create index if not exists payment_transactions_created_at_idx on public.payment_transactions(created_at desc);

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cities text[] not null default '{}',
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  free_shipping_threshold numeric(12,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  estimated_days text not null default '2-5 business days',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  promotion_type text not null default 'discount',
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.refund_requests enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.promotions enable row level security;

drop policy if exists "admin manage refund requests" on public.refund_requests;
create policy "admin manage refund requests" on public.refund_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage payment transactions" on public.payment_transactions;
create policy "admin manage payment transactions" on public.payment_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage shipping zones" on public.shipping_zones;
create policy "admin manage shipping zones" on public.shipping_zones for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage promotions" on public.promotions;
create policy "admin manage promotions" on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());
