-- Repair missing profile columns used by the admin profile and customer list APIs.
-- Safe to run more than once.
alter table public.profiles
  add column if not exists email text,
  add column if not exists bio text not null default '',
  add column if not exists hobbies text not null default '',
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'phone', ''), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;
