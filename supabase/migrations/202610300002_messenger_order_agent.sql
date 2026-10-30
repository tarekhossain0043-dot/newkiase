create table if not exists public.messenger_customer_links (id uuid primary key default gen_random_uuid(), phone text not null unique, page_scoped_id text not null, consented_at timestamptz not null default now(), last_interaction_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists messenger_customer_links_last_interaction_idx on public.messenger_customer_links(last_interaction_at desc);
alter table public.messenger_customer_links enable row level security;
