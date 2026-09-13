-- ============================================================
-- AG7 CARS — add "color" to cars, live_deals, deliveries
-- Powers the color-reactive background glow on the landing page:
-- when a car/deal/delivery is the active carousel card, the
-- section's background softly tints toward that car's color.
-- ============================================================

alter table public.cars
add column if not exists color text;

alter table public.live_deals
add column if not exists color text;

alter table public.deliveries
add column if not exists color text;
