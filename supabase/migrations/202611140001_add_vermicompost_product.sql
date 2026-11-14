-- Add Tarek's GreenNest organic fertilizer category and initial vermicompost stock.
-- Safe to re-run: category and product are upserted using stable slugs/SKU.

insert into public.categories (name, slug, description, image_url, is_active, sort_order)
values (
  'Organic Fertilizer',
  'organic-fertilizer',
  'Natural and organic fertilizers for gardening and agriculture',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=82',
  true,
  7
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  sku, name, slug, brand, category_id, description,
  price, cost_price, stock_quantity, sizes, color, status, is_featured
)
select
  'TG-VERMI-50KG',
  'Vermicompost Organic Fertilizer - 50kg',
  'vermicompost-organic-fertilizer-50kg',
  'Tarek''s GreenNest',
  c.id,
  'প্রাকৃতিক কেঁচো সার (Vermicompost) — ৫০ কেজির বস্তা। বাগান, ছাদবাগান ও কৃষিকাজে মাটির গুণাগুণ উন্নত করতে ব্যবহারযোগ্য।',
  800.00,
  0.00,
  50,
  array['50 kg']::text[],
  'Organic',
  'active',
  false
from public.categories c
where c.slug = 'organic-fertilizer'
on conflict (sku) do update set
  name = excluded.name,
  slug = excluded.slug,
  brand = excluded.brand,
  category_id = excluded.category_id,
  description = excluded.description,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  sizes = excluded.sizes,
  color = excluded.color,
  status = excluded.status,
  updated_at = now();
