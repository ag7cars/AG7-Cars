alter table public.cars
add column if not exists image_urls text[] not null default '{}';
