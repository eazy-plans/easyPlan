-- ============================================================
-- Direct event -> lead link, plus extra phone numbers per lead
-- ============================================================
-- Event<->lead lookup was done by comparing client_phone strings, which
-- breaks the moment an event's contact phone differs from the lead's own
-- (a different family member calling in, a typo fixed on one side only).
-- A direct FK, set once at booking time, replaces that fragile lookup.

alter table events add column lead_id uuid references leads(id) on delete set null;

create index idx_events_lead_id on events(lead_id) where lead_id is not null;

-- Extra phone numbers for a lead (the lead's own client_phone column stays
-- the primary number - this is additional numbers, e.g. a spouse or a
-- different contact for a specific event).
create table lead_phones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  phone text not null,
  label text,
  created_at timestamptz not null default now(),
  unique(lead_id, phone)
);

create index idx_lead_phones_lead_id on lead_phones(lead_id);

alter table lead_phones enable row level security;

create policy "lead_phones_admin_secretary" on lead_phones
  for all using (current_user_role() in ('admin', 'secretary'));
