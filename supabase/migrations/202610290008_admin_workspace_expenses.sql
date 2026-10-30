-- Admin operating expenses for profit and loss reporting.
create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general',
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.operating_expenses enable row level security;
drop policy if exists "admin manage operating expenses" on public.operating_expenses;
create policy "admin manage operating expenses" on public.operating_expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
