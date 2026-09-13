-- ============================================================
-- AG7 Cars — Hero Photos admin feature
--
-- Adds a `hero_images` table so the homepage hero's rotating
-- background photos (desktop set of 4, mobile set of 4) can be
-- changed from the admin panel instead of being hardcoded files.
--
-- Seeds it with the CURRENT static images, so nothing changes on
-- the live site until an admin actually replaces a photo through
-- the new "Hero Photos" admin page.
--
-- How to run: new project's dashboard → SQL Editor → paste this
-- whole file → Run. Only needs to run once.
-- ============================================================

create table public.hero_images (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('desktop', 'mobile')),
  position integer not null check (position between 1 and 4),
  image_url text not null,
  updated_at timestamptz not null default now(),
  unique (slot, position)
);

alter table public.hero_images enable row level security;

create policy "Public can view hero images" on public.hero_images
  for select to anon, authenticated
  using (true);

create policy "Admins can insert hero images" on public.hero_images
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can update hero images" on public.hero_images
  for update to authenticated
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

-- Matches components/home/Hero.tsx's current DESKTOP_IMAGES /
-- MOBILE_IMAGES arrays exactly, so the hero looks identical to
-- today until someone changes a photo through the admin form.
insert into public.hero_images (slot, position, image_url) values
  ('desktop', 1, '/images/Home (1).jpg'),
  ('desktop', 2, '/images/Home (3).jpg'),
  ('desktop', 3, '/images/Home (4).jpg'),
  ('desktop', 4, '/images/Home (5).jpg'),
  ('mobile', 1, '/images/home-mobile 1.jpg'),
  ('mobile', 2, '/images/home-mobile 2.jpg'),
  ('mobile', 3, '/images/home-mobile 3.jpg'),
  ('mobile', 4, '/images/home-mobile 4.jpg')
on conflict (slot, position) do update
  set image_url = excluded.image_url
  -- Only overwrites a row that's still pointing at a local default
  -- image — never touches a slot you've already replaced with a
  -- real upload through the admin form (those point at Supabase
  -- Storage instead, not /images/...).
  where public.hero_images.image_url like '/images/%';
