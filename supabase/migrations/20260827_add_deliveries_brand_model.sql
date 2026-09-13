-- ============================================================
-- AG7 CARS — DELIVERIES: add brand + model
-- The new "reel" style landing page card shows Brand + Model
-- text on a vertical sidebar next to the photo/video, replacing
-- the old free-text caption for new entries.
-- ============================================================

alter table public.deliveries
add column if not exists brand text;

alter table public.deliveries
add column if not exists model text;

-- caption column is left in place (existing rows keep their
-- data), it's just no longer used by the admin form going
-- forward.
