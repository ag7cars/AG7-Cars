-- ============================================================
-- AG7 CARS — TESTIMONIALS + FOUNDER
-- ============================================================

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  photo_url text not null,
  message text not null,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index testimonials_created_at_idx on public.testimonials(created_at desc);

alter table public.testimonials enable row level security;

create policy "Public can view published testimonials"
on public.testimonials for select to anon, authenticated
using (is_published = true);

create policy "Admins can view all testimonials"
on public.testimonials for select to authenticated
using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can insert testimonials"
on public.testimonials for insert to authenticated
with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can update testimonials"
on public.testimonials for update to authenticated
using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

create policy "Admins can delete testimonials"
on public.testimonials for delete to authenticated
using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));


-- Single-row settings table for the Founder section — always one
-- row, id fixed to 'main', updated in place (never inserted again).
create table public.founder_profile (
  id text primary key default 'main',
  name text not null default '',
  title text not null default '',
  photo_url text,
  message text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.founder_profile (id) values ('main');

alter table public.founder_profile enable row level security;

create policy "Public can view founder profile"
on public.founder_profile for select to anon, authenticated
using (true);

create policy "Admins can update founder profile"
on public.founder_profile for update to authenticated
using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

-- Photos for both live in the same 'car-images' storage bucket under
-- testimonials/ and founder/ prefixes — no new storage policies
-- needed, the existing admin policies already cover the whole bucket.
