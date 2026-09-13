-- ============================================================
-- AG7 CARS — LIVE DEALS
-- Standalone table, independent from the cars collection.
-- ============================================================

create table public.live_deals (
  id uuid primary key default gen_random_uuid(),

  -- Basic information
  brand text not null,
  name text not null,

  -- Pricing
  original_price numeric(15,2) not null,
  deal_price numeric(15,2) not null,
  currency text not null default 'INR',

  -- Detail
  description text,

  -- Images (first image = cover, order = display order)
  image_urls text[] not null default '{}',

  -- Ordering / visibility
  display_order integer not null default 0,
  is_published boolean not null default true,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index live_deals_created_at_idx
on public.live_deals(created_at desc);

create index live_deals_published_idx
on public.live_deals(is_published);


-- ============================================================
-- AUTOMATIC updated_at
-- ============================================================

create or replace function public.update_live_deals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger live_deals_updated_at
before update on public.live_deals
for each row
execute function public.update_live_deals_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.live_deals enable row level security;

create policy "Public can view published live deals"
on public.live_deals
for select
to anon, authenticated
using (is_published = true);

create policy "Admins can insert live deals"
on public.live_deals
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- Images for live deals are stored in the SAME 'car-images'
-- storage bucket (under a live-deals/ prefix), so no new
-- storage policies are needed — the admin upload/delete/update
-- policies you already have cover the whole bucket.
