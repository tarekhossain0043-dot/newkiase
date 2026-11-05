-- Add wireless neckband products from the storefront screenshot.
-- Prices match the screenshot; stock stays at zero until verified.

insert into public.categories (name, slug, description, is_active, sort_order)
values (
  'Electronics',
  'electronics',
  'Wireless audio and electronic accessories',
  true,
  7
)
on conflict (slug) do update set
  is_active = true,
  updated_at = now();

with catalogue (
  sku, name, slug, brand, description, price, color, image_path
) as (
  values
    (
      'NB-20261105-MOBICOM-300H',
      'Mobicom Wireless Neckband Headset 300 Hours',
      'mobicom-wireless-neckband-headset-300-hours',
      'Mobicom',
      'Wireless neckband headset. The product listing shows 300 hours.',
      1399::numeric,
      'Black',
      '/products/mobicom-wireless-neckband-300h.jpeg'
    ),
    (
      'NB-20261105-REGRSI-200H',
      'Regrsi Wireless Neckband Bluetooth Earphone',
      'regrsi-wireless-neckband-bluetooth-earphone',
      'Regrsi',
      'Wireless neckband Bluetooth earphone. The product image shows 200 hours.',
      582::numeric,
      'Black',
      '/products/regrsi-wireless-neckband.jpeg'
    ),
    (
      'NB-20261105-FRB-N26',
      'FRB N-26 Bluetooth Neckband BT 5.4',
      'frb-n-26-bluetooth-neckband-bt-5-4',
      'FRB',
      'N-26 Bluetooth neckband with BT 5.4. The listing shows 600 hours.',
      1099::numeric,
      'Black',
      '/products/frb-n26-bluetooth-neckband.jpeg'
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
    array[]::text[],
    c.color,
    'active',
    false
  from catalogue c
  join public.categories cat on cat.slug = 'electronics'
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
