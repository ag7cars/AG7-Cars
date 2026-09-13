-- ============================================================
-- AG7 CARS — DELIVERIES
-- Standalone table for delivery photos/videos shown on the
-- landing page (latest 5), added one at a time from admin.
-- ============================================================

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),

  -- Media (one file per delivery entry — photo OR video)
  media_url text not null,
  media_type text not null
    check (media_type in ('image', 'video')),

  -- Optional caption, e.g. "Range Rover delivered to Mr. Sharma, Mumbai"
  caption text,

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

create index deliveries_created_at_idx
on public.deliveries(created_at desc);

create index deliveries_published_idx
on public.deliveries(is_published);


-- ============================================================
-- AUTOMATIC updated_at
-- ============================================================

create or replace function public.update_deliveries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger deliveries_updated_at
before update on public.deliveries
for each row
execute function public.update_deliveries_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.deliveries enable row level security;

create policy "Public can view published deliveries"
on public.deliveries
for select
to anon, authenticated
using (is_published = true);

create policy "Admins can insert deliveries"
on public.deliveries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- Delivery media is stored in the SAME 'car-images' storage
-- bucket (under a deliveries/ prefix), so no new storage
-- policies are needed — your existing admin upload/delete/update
-- policies already cover the whole bucket, for any file type.
