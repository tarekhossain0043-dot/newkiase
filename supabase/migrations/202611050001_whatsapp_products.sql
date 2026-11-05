-- Add products from the 2026-11-05 WhatsApp product photo archive.
-- Prices other than Moslem Glycerine are estimates; stock stays at zero until verified.

insert into public.categories (name, slug, description, is_active, sort_order)
values
  ('Cosmetics', 'cosmetics', 'Beauty and skincare essentials', true, 2),
  ('Hair & Body Care', 'hair-body-care', 'Haircare and personal-care essentials', true, 6)
on conflict (slug) do update set
  is_active = true,
  updated_at = now();

with catalogue (
  sku, name, slug, brand, category_slug, description, price, sizes, color, image_path
) as (
  values
    (
      'WA-20261105-SHOURAV-MEHENDI',
      'Shourav Ranga Ruposii Active Cone Mehendi',
      'shourav-ranga-ruposii-active-cone-mehendi',
      'Shourav',
      'cosmetics',
      'Long-lasting active cone mehendi.',
      40::numeric,
      array[]::text[],
      'Red',
      '/products/shourav-cone-mehendi.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-GLYCERINE-120G',
      'Moslem Magic Glycerine 120 g',
      'moslem-magic-glycerine-120g',
      'Moslem',
      'hair-body-care',
      'Glycerine for dry skin. The package shows an MRP of ৳128.',
      128::numeric,
      array[]::text[],
      'Clear',
      '/products/moslem-glycerine-120g.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-HAIR-GEL',
      'Moslem Complete Natural Hair Gel',
      'moslem-complete-natural-hair-gel',
      'Moslem',
      'hair-body-care',
      'Complete natural hair gel.',
      180::numeric,
      array[]::text[],
      'Natural',
      '/products/moslem-natural-hair-gel.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-HAIR-OIL-500ML',
      'Moslem Magic Hair Oil 500 ml',
      'moslem-magic-hair-oil-500ml',
      'Moslem',
      'hair-body-care',
      'Herbal care hair oil.',
      250::numeric,
      array[]::text[],
      'Clear',
      '/products/moslem-magic-hair-oil-500ml.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-MIX-BERRY-SHOWER-GEL',
      'Moslem Mix Berry Shower Gel 500 g',
      'moslem-mix-berry-shower-gel-500g',
      'Moslem',
      'hair-body-care',
      'Mix berry shower gel with berry extracts.',
      320::numeric,
      array[]::text[],
      'Pink',
      '/products/moslem-mix-berry-shower-gel-500g.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-HONEY-GLOW-SHOWER-GEL',
      'Moslem Honey Glow Shower Gel 250 ml',
      'moslem-honey-glow-shower-gel-250ml',
      'Moslem',
      'hair-body-care',
      'Honey Glow shower gel with a long-lasting fragrance.',
      180::numeric,
      array[]::text[],
      'Amber',
      '/products/moslem-honey-glow-shower-gel-250ml.jpeg'
    ),
    (
      'WA-20261105-MOSLEM-PURPLE-BLISS-SHOWER-GEL',
      'Moslem Purple Bliss Shower Gel 250 ml',
      'moslem-purple-bliss-shower-gel-250ml',
      'Moslem',
      'hair-body-care',
      'Purple Bliss shower gel with a relaxing lavender fragrance.',
      180::numeric,
      array[]::text[],
      'Purple',
      '/products/moslem-purple-bliss-shower-gel-250ml.jpeg'
    )
),
saved_products as (
  insert into public.products (
    sku, name, slug, brand, category_id, description, price, stock_quantity,
    sizes, color, status, is_featured
  )
  select
    c.sku,
    c.name,
    c.slug,
    c.brand,
    cat.id,
    c.description,
    c.price,
    0,
    c.sizes,
    c.color,
    'active',
    false
  from catalogue c
  join public.categories cat on cat.slug = c.category_slug
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
    updated_at = now()
  returning id, sku, name
)
insert into public.product_images (product_id, storage_path, alt_text, sort_order)
select p.id, c.image_path, p.name, 0
from saved_products p
join catalogue c on c.sku = p.sku
on conflict (product_id, storage_path) do update set
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order;
