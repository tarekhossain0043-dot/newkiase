alter table public.shipping_zones
  add column if not exists cod_delivery_fee numeric(10,2);

update public.shipping_zones
set cod_delivery_fee = delivery_fee
where cod_delivery_fee is null;

alter table public.shipping_zones
  alter column cod_delivery_fee set default 0;

alter table public.shipping_zones
  alter column cod_delivery_fee set not null;
