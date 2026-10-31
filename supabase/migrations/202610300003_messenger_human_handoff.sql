create table if not exists public.messenger_conversations (
  id uuid primary key default gen_random_uuid(),
  psid text not null unique,
  ai_enabled boolean not null default true,
  handoff_at timestamptz,
  last_customer_message_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists messenger_conversations_updated_at_idx
  on public.messenger_conversations(updated_at desc);
alter table public.messenger_conversations enable row level security;
-- Only trusted server-side service-role code may read or change Page-scoped IDs.
