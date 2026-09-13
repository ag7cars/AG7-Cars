-- ============================================================
-- AG7 Cars — new Supabase project setup
--
-- Recreates the schema the app actually uses (cars, live_deals,
-- deliveries, admin_users), their RLS policies, and the car-images
-- storage bucket. No data is copied over — this is a clean start,
-- as requested.
--
-- Not recreated: admin_credentials, user_roles, delivery_media_items,
-- and the delivery-media storage bucket — none of these are
-- referenced anywhere in the app code, they were leftovers from an
-- earlier approach on the old project.
--
-- How to run: open the new project's dashboard → SQL Editor → paste
-- this whole file → Run. It only needs to run once.
-- ============================================================

-- Safe to re-run: clears out anything left over from a previous
-- attempt (e.g. the earlier run that failed partway through because
-- admin_users didn't exist yet) before recreating everything in the
-- correct order.
drop table if exists public.cars cascade;
drop table if exists public.live_deals cascade;
drop table if exists public.deliveries cascade;
drop table if exists public.admin_users cascade;

-- ---------- ADMIN USERS ----------
-- Created first — cars/live_deals/deliveries policies below all
-- reference this table, so it has to exist before them.
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can read their own record" on public.admin_users
  for select to authenticated
  using (auth.uid() = user_id);


-- ---------- CARS ----------
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  slug text not null unique,
  price numeric,
  status text not null default 'available',
  km_driven integer,
  year integer,
  fuel text,
  engine text,
  condition text not null default 'pre-owned',
  description text,
  main_image text,
  image_2 text,
  image_3 text,
  image_4 text,
  image_5 text,
  image_6 text,
  image_7 text,
  image_8 text,
  image_9 text,
  image_10 text,
  meta_title text,
  meta_description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  featured boolean not null default false,
  display_order integer not null default 0,
  currency text not null default 'INR',
  category text not null default 'Pre-Owned',
  image_urls text[] not null default '{}',
  color text,
  color_hex text,
  body_type text,
  manufacturing_year integer,
  ownership text
);

alter table public.cars enable row level security;

create policy "Public can view published cars" on public.cars
  for select to anon, authenticated
  using (is_published = true);

create policy "Admins can view all cars" on public.cars
  for select to public
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can insert cars" on public.cars
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can update cars" on public.cars
  for update to public
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can delete cars" on public.cars
  for delete to authenticated
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));


-- ---------- LIVE DEALS ----------
create table public.live_deals (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  original_price numeric not null,
  deal_price numeric not null,
  currency text not null default 'INR',
  description text,
  image_urls text[] not null default '{}',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  color text,
  color_hex text
);

alter table public.live_deals enable row level security;

create policy "Public can view published live deals" on public.live_deals
  for select to anon, authenticated
  using (is_published = true);

create policy "Admins can view all live deals" on public.live_deals
  for select to public
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can insert live deals" on public.live_deals
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can update live deals" on public.live_deals
  for update to public
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can delete live deals" on public.live_deals
  for delete to authenticated
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));


-- ---------- DELIVERIES ----------
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  media_url text not null,
  media_type text not null,
  caption text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand text,
  model text,
  color text,
  color_hex text
);

alter table public.deliveries enable row level security;

create policy "Public can view published deliveries" on public.deliveries
  for select to anon, authenticated
  using (is_published = true);

create policy "Admins can insert deliveries" on public.deliveries
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

-- No admin edit/delete UI exists yet for deliveries, so no
-- UPDATE/DELETE policy is added here either — add one the same way
-- as cars/live_deals above if that admin feature gets built later.


-- ---------- STORAGE ----------
-- storage.objects is Supabase's own table (not dropped above), so
-- any policies left over from a previous partial run are cleared
-- explicitly to keep this script safe to re-run.
drop policy if exists "Public can view car images" on storage.objects;
drop policy if exists "Admins can upload car images" on storage.objects;
drop policy if exists "Admins can update car images" on storage.objects;
drop policy if exists "Admins can delete car images" on storage.objects;

insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do nothing;

create policy "Public can view car images" on storage.objects
  for select to public
  using (bucket_id = 'car-images');

create policy "Admins can upload car images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'car-images'
    and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
  );

create policy "Admins can update car images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'car-images'
    and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
  );

create policy "Admins can delete car images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'car-images'
    and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
  );

-- ============================================================
-- AFTER running the above:
--
-- 1. In the new project's dashboard, go to Authentication > Users >
--    Add user, and create the admin login (email + password).
--
-- 2. Copy that user's UUID (shown in the Users table), then run:
--
--    insert into public.admin_users (user_id) values ('<paste-uuid-here>');
--
--    That's what lets that login into /admin/login and /admin/dashboard.
-- ============================================================
