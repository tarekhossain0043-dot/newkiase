-- Repair schema columns required by live admin profile and dashboard analytics.
-- Safe to run multiple times in Supabase SQL Editor.
alter table public.products
  add column if not exists cost_price numeric(12,2) not null default 0;

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists hobbies text not null default '',
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

create index if not exists products_cost_price_idx on public.products(cost_price);
