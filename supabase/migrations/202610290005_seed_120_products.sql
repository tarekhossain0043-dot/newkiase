-- Seed 120 active demo-catalogue products (20 per category) for NEXORA.
-- Safe to re-run: categories are upserted and product SKUs are stable.
-- Apply this migration in Supabase SQL Editor or with Supabase CLI.

insert into public.categories (name, slug, description, image_url, is_active, sort_order)
values
  ('Shoes', 'shoes', 'Everyday footwear and sneakers', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82', true, 1),
  ('Cosmetics', 'cosmetics', 'Beauty and skincare essentials', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82', true, 2),
  ('Accessories', 'accessories', 'Bags and everyday accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=82', true, 3),
  ('Socks', 'socks', 'Comfortable everyday socks', 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=82', true, 4),
  ('Shoe Care', 'shoe-care', 'Cleaning and shoe-care essentials', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=82', true, 5),
  ('Hair & Body Care', 'hair-body-care', 'Haircare and personal-care essentials', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82', true, 6)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

with catalogue as (
  select * from (values
    ('shoes', 'SH', 1890::numeric, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82',
      array['UrbanStep','StreetForm','StrideCo','WalkWay','NorthStar']::text[],
      array['Everyday Runner Sneakers','Classic White Sneakers','Casual Canvas Shoes','Lightweight Sports Shoes','Leather Formal Shoes','Everyday Slip-ons','Retro Court Sneakers','Breathable Walking Shoes','Minimal Low-top Sneakers','Comfort Trainers']::text[],
      'Comfortable footwear for daily wear. Check your preferred size before ordering.'),
    ('cosmetics', 'CS', 350::numeric, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82',
      array['GlowLab','ColorMuse','BeautyNest','Luma Beauty','DailyGlow']::text[],
      array['Daily Skin Care Set','Essential Makeup Kit','Hydrating Face Serum','Matte Lip Color','Gentle Face Cleanser','Daily Moisturizer','Vitamin C Face Serum','Soft Matte Foundation','Waterproof Mascara','Rose Lip Balm']::text[],
      'Beauty and skincare item. Read the packaging and ingredient information before use.'),
    ('accessories', 'AC', 490::numeric, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=82',
      array['Nexora Select','UrbanForm','CarryKind','StyleCraft','DailyCarry']::text[],
      array['Everyday Crossbody Bag','Classic Belt and Wallet Set','Minimalist Wallet','Everyday Tote Bag','Compact Card Holder','Adjustable Casual Belt','Travel Organizer Pouch','Classic Sunglasses','Everyday Backpack','Slim Shoulder Bag']::text[],
      'A versatile accessory for daily use. Colour and finish can vary slightly by screen.'),
    ('socks', 'SK', 120::numeric, 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=82',
      array['StepSoft','ComfortLoop','CottonDay','StrideCo','DailyWear']::text[],
      array['Comfort Cotton Socks 3-Pack','Ankle Sports Socks','Classic Crew Socks','No-show Socks Set','Cushioned Running Socks','Formal Business Socks','Striped Casual Socks','Breathable Cotton Socks','Winter Warm Socks','Everyday Essentials Socks']::text[],
      'Everyday socks designed for comfort. Check the pack size and details before checkout.'),
    ('shoe-care', 'SC', 180::numeric, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=82',
      array['SoleCare','ShinePro','CleanKicks','FreshSole','StepShine']::text[],
      array['Premium Shoe Polish Kit','Shoe Cleaning Brush Set','Black Shoe Polish','Neutral Leather Cream','Sneaker Cleaning Foam','Shoe Deodorizer','Leather Conditioner','White Sneaker Cleaner','Shoe Shine Cloth','Water Repellent Protector']::text[],
      'Shoe-care essential. Follow the product label and test on a small area first.'),
    ('hair-body-care', 'HB', 240::numeric, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82',
      array['FreshRoot','AromaDay','ActiveFresh','DailyCare','PureBloom']::text[],
      array['Daily Fresh Shampoo','Signature Body Mist','Sport Deodorant','Moisture Care Shampoo','Refreshing Body Wash','Daily Conditioner','Fresh Citrus Body Spray','Nourishing Hair Oil','Gentle Body Lotion','Daily Shower Gel']::text[],
      'Personal-care product. Read ingredients and usage instructions on the packaging.')
  ) as x(category_slug, code, base_price, image_url, brands, names, description)
),
generated as (
  select
    c.*,
    gs.n,
    c.names[((gs.n - 1) % cardinality(c.names)) + 1] ||
      case when gs.n > cardinality(c.names) then ' - Edition ' || lpad(gs.n::text, 2, '0') else '' end as product_name,
    c.brands[((gs.n - 1) % cardinality(c.brands)) + 1] as product_brand
  from catalogue c
  cross join generate_series(1, 20) as gs(n)
),
inserted as (
  insert into public.products
    (sku, name, slug, brand, category_id, description, price, compare_at_price, stock_quantity, sizes, color, status, is_featured)
  select
    'NX-SEED-' || g.code || '-' || lpad(g.n::text, 3, '0'),
    g.product_name,
    g.category_slug || '-' || g.code || '-' || lpad(g.n::text, 3, '0'),
    g.product_brand,
    cat.id,
    g.description,
    g.base_price + ((g.n % 8) * 125),
    case when g.n % 4 = 0 then g.base_price + ((g.n % 8) * 125) + 250 else null end,
    5 + ((g.n * 3) % 36),
    case when g.category_slug = 'shoes' then array['EU 39','EU 40','EU 41','EU 42','EU 43','EU 44']
         when g.category_slug = 'socks' then array['S','M','L','Free Size']
         when g.category_slug = 'accessories' then array['One Size']
         when g.category_slug = 'cosmetics' then array['10 ml','30 ml','50 ml']
         when g.category_slug = 'hair-body-care' then array['100 ml','200 ml','400 ml']
         else array['50 g','100 g','150 g'] end,
    (array['Black','White','Beige','Navy','Mixed'])[((g.n - 1) % 5) + 1],
    'active',
    (g.n % 7 = 0)
  from generated g
  join public.categories cat on cat.slug = g.category_slug
  on conflict (sku) do nothing
  returning id, sku, name, category_id
)
insert into public.product_images (product_id, storage_path, alt_text, sort_order)
select p.id,
  case cat.slug
    when 'shoes' then 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82'
    when 'cosmetics' then 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82'
    when 'accessories' then 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=82'
    when 'socks' then 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=82'
    when 'shoe-care' then 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=82'
    else 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82'
  end,
  p.name,
  0
from public.products p
join public.categories cat on cat.id = p.category_id
where p.sku like 'NX-SEED-%'
  and not exists (select 1 from public.product_images pi where pi.product_id = p.id);
