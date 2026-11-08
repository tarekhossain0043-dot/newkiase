-- Restore the previously configured NEXORA brands in site_settings.
-- Existing non-empty brand settings are preserved; this only seeds an empty/missing value.
insert into public.site_settings (key, value, updated_at)
values (
  'brands',
  '[
    {"id":"anis-herbal","name":"Anis Herbal","description":"","image_url":"/brand-logos/anis-herbal.svg","href":"/#shop","is_active":true},
    {"id":"moslem","name":"Moslem","description":"","image_url":"/brand-logos/moslem.svg","href":"/#shop","is_active":true},
    {"id":"frb","name":"FRB","description":"","image_url":"/brand-logos/frb.svg","href":"/#shop","is_active":true},
    {"id":"air-jordan","name":"Air Jordan","description":"","image_url":"/brand-logos/air-jordan.svg","href":"/#shop","is_active":true},
    {"id":"regrsi","name":"Regrsi","description":"","image_url":"/brand-logos/reggsi.jpg.svg","href":"/#shop","is_active":true},
    {"id":"converse","name":"Converse","description":"","image_url":"/brand-logos/converse.jpg.svg","href":"/#shop","is_active":true}
  ]'::jsonb,
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now()
where public.site_settings.value = '[]'::jsonb
   or jsonb_typeof(public.site_settings.value) <> 'array';
