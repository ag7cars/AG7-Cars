-- ============================================================
-- AG7 CARS — add "color_hex" to cars, live_deals, deliveries
--
-- "color" stays as a free-text display name (e.g. "Rosso Corsa",
-- "Verde Mantis") — any name, no restriction.
--
-- "color_hex" is the exact shade picked via a color picker in the
-- admin form, and is what actually drives the landing page's
-- background glow — this way the glow is always exactly right,
-- regardless of what the color is named.
-- ============================================================

alter table public.cars
add column if not exists color_hex text;

alter table public.live_deals
add column if not exists color_hex text;

alter table public.deliveries
add column if not exists color_hex text;
