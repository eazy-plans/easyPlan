-- ============================================================
-- Allow more than one inquiry per lead/venue pair, in chronological order
-- ============================================================
-- The unique(lead_id, venue_id) constraint from 010 meant a lead could
-- only ever have a single logged inquiry per venue, which collapses a
-- client's actual history (considered it, came back months later, booked)
-- into one overwritten row. Drop the constraint and let every inquiry be
-- its own row, ordered by the existing created_at.

alter table lead_inquiries drop constraint if exists lead_inquiries_lead_id_venue_id_key;

create index if not exists idx_lead_inquiries_lead_venue on lead_inquiries(lead_id, venue_id);

-- Distinguishes the "+ פנייה מהירה" quick-inquiry dialog (LeadsManager)
-- from the regular add-inquiry flow (LeadDetailTabs) - used by the
-- notifications "quick inquiries" tab.
alter table lead_inquiries add column source text not null default 'manual';

alter table lead_inquiries add constraint lead_inquiries_source_check check (source in ('manual', 'quick'));
