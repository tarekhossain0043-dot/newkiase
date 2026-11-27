-- Customer review image/video attachments.
alter table public.product_reviews
  add column if not exists media_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-review-media',
  'product-review-media',
  true,
  31457280,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
