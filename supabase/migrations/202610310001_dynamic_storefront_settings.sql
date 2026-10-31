-- Public storefront/payment configuration is served through a server-side allowlisted API.
-- Do not expose admin-only site settings through direct anonymous table access.
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings
  for select to anon, authenticated
  using (key in ('storefront', 'shipping'));
