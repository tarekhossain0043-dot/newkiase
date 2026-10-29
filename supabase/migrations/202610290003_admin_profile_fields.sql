alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists hobbies text not null default '',
  add column if not exists avatar_url text,
  add column if not exists cover_url text;
