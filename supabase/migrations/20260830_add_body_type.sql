-- ============================================================
-- AG7 CARS — add "body_type" to cars
-- Powers the Body Type filter on the /cars browse-all page.
-- ============================================================

alter table public.cars
add column if not exists body_type text;
