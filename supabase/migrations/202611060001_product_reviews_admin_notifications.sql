create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);
create index if not exists product_reviews_product_created_idx
  on public.product_reviews(product_id, created_at desc);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('order','review','system')),
  title text not null,
  description text not null,
  reference_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists admin_notifications_created_idx
  on public.admin_notifications(created_at desc);
create index if not exists admin_notifications_unread_idx
  on public.admin_notifications(is_read, created_at desc);
alter table public.product_reviews enable row level security;
alter table public.admin_notifications enable row level security;
-- Public customers can read approved/public reviews and submit reviews through the server API only.
-- Service-role API writes reviews and notifications; dashboard reads notifications through requireAdmin.
