-- ============================================================
-- Venue contact person
-- ============================================================
-- Free-text contact person name + phone for the venue, shown to staff on the
-- venue detail page so secretaries know who to call at the hall.

alter table venues
  add column if not exists contact_name text,
  add column if not exists contact_phone text;
