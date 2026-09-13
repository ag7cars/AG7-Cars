-- ============================================================
-- AG7 Cars — Registration field for cars
--
-- Adds a free-text "Registration" field to the admin Add/Edit Car
-- forms (e.g. "MP 09", "MP 10" — the RTO/state code, separate from
-- the existing numeric "Registration Year").
--
-- How to run: your Supabase project's dashboard -> SQL Editor ->
-- paste this whole file -> Run. Safe to run more than once.
-- ============================================================

alter table public.cars add column if not exists registration text;
