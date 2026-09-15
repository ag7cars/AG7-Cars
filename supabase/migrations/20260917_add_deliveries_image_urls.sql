-- ============================================================
-- AG7 CARS — DELIVERIES: MULTI-PHOTO ENTRIES
-- Mirrors the same pattern already used by cars/live_deals: one
-- entry can hold several photos (image_urls[0] is the cover shown
-- everywhere; the full array is shown on the entry's detail page).
-- Existing single-photo delivery rows keep working as-is — code
-- falls back to [media_url] when image_urls is null.
-- ============================================================

alter table public.deliveries
add column if not exists image_urls text[];
