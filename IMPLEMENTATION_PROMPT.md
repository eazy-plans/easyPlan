# Eazyplans Product Requirements — Implementation Prompt

Copy this entire prompt and give it to Claude when implementing features. It includes all necessary context.

---

## Background: Eazyplans Architecture

**Project**: Eazyplans — Event hall management SaaS  
**Tech Stack**: Next.js 14 + TypeScript + Tailwind + shadcn/ui + Supabase + React Big Calendar  
**User Roles**: admin, secretary, venue_owner  
**Key Constraint**: RTL/Hebrew, dates in DD/MM/YYYY format, prices in ₪

**Current DB Tables**:
- `users` (id, email, full_name, role, created_at)
- `venues` (id, name, address, city, max_capacity, price_morning/evening/full_day/shabbat, description, owner_user_id, is_active, created_at)
- `events` (id, venue_id, date, event_type, event_purpose, status, client_name, client_phone, client_email, notes, price_listed, discount_amount, price_final, created_by, created_at, updated_at)
- `leads` (id, client_name, client_phone, client_email, status, notes, created_at, updated_at)
- `lead_venue_interests` (id, lead_id, venue_id, created_at) — simple join table
- `booking_locks` (id, venue_id, date, event_type, locked_by_user_id, locked_until, created_at)
- `email_logs` (id, event_id, recipient_email, email_type, sent_at, status)
- `waitlist` (id, lead_id, venue_id, requested_date, created_at)

**Booking Flow**: 6-step wizard → select date/type → filter venues → select venue → enter client details → confirm → creates Event + updates Lead

**Current Issue**: LeadStatus is per-lead (global), but product needs per-inquiry tracking. A lead can be "too_expensive" for Venue A but "not relevant" for Venue B. These inquiries need separate status tracking with rejection reasons.

---

## Feature Requirements (Prioritized)

### TIER 1 (Critical): Data Model Foundation

#### Feature 1.1: Lead Inquiries Table
Create a new table to track each venue inquiry separately (not per-lead globally):

```sql
CREATE TABLE lead_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'considering',
  -- Status enum values: 'considering', 'too_expensive', 'not_relevant', 'not_interested', 'booked', 'cancelled'
  rejection_reason text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(lead_id, venue_id)
);
```

**Why**: Currently a lead can only have one status. Product needs to track that Lead "John Smith" was "too_expensive" for Venue A but was "not relevant" for Venue B.

**Code Impact**:
- Create Supabase migration: `supabase/migrations/010_lead_inquiries.sql`
- Add types to `src/types/database.ts`: `LeadInquiryRow` interface
- Update `LeadsContent.tsx`: Query should join to lead_inquiries
- Booking wizard step 5: After creating event, create/update lead_inquiry record
- Lead detail view (new): Show timeline of all inquiries with their statuses

---

#### Feature 1.2: Venue Amenities Checkboxes
Add boolean fields to venues table:

```sql
ALTER TABLE venues ADD COLUMN (
  has_elevator boolean DEFAULT false,
  has_parking boolean DEFAULT false,
  is_accessible boolean DEFAULT false,
  has_public_transport boolean DEFAULT false
);
```

**Why**: Product wants to mark venues with quick amenity indicators (elevator, parking, accessible, public transport). These are important selection criteria.

**Code Impact**:
- Create migration: `supabase/migrations/011_venue_amenities.sql`
- Update `VenueRow` type in database.ts
- Update venue edit form (`VenueDetailTabs`): Add 4 checkboxes
- Venue detail view: Display amenities as icons or chips

---

#### Feature 1.3: Event Booking Date
Add explicit booking_date field to events (distinct from system created_at):

```sql
ALTER TABLE events ADD COLUMN booking_date timestamp;
```

**Why**: `created_at` is when the event was logged in the system. We need `booking_date` for when the client actually confirmed the booking.

**Code Impact**:
- Create migration: `supabase/migrations/012_event_booking_date.sql`
- Update `EventRow` type in database.ts
- Booking wizard step 5: Set booking_date = now() when event is created
- Event detail: Show "Booked on: [booking_date]" separately from created_at

---

### TIER 2: Lead Management Features

#### Feature 2.1: Lead Detail Page with Full History
Create new page `/app/(app)/leads/[id]/page.tsx` showing:

1. **Lead Info**: Name, phone, email
2. **Inquiries Timeline**: For each lead_inquiry:
   - Venue name
   - Status (considering, too_expensive, not_relevant, not_interested)
   - Rejection reason (if applicable)
   - Date of inquiry
3. **Confirmed Bookings**: All events where client_email matches this lead's email
4. **Statistics**:
   - Total inquiries sent
   - Conversion rate (inquiries → confirmed bookings)
   - Bookings by year/month (confirmed, cancelled breakdown)

**Use RTL styling** and Hebrew text throughout.

---

#### Feature 2.2: Lead Search & Multi-Field Filtering
Update `LeadsContent.tsx` and `LeadsManager` component:

**Add filter UI**:
- Search by name (text input)
- Search by phone (text input)
- Search by email (text input)
- Filter by status (dropdown: new, considering, booked, etc.)
- Support multi-field filtering (e.g., name AND phone simultaneously)

**Implementation**:
- Add filter state to LeadsManager
- Apply `.ilike()` filters to Supabase query
- Debounce search input to avoid excessive queries
- Preserve filters in URL params (optional, for bookmarking)

---

#### Feature 2.3: Lead Creation Auto-Complete (First Character)
Update lead creation/search input to trigger suggestions on first character typed:

**Where**: Booking wizard step 5 (client details form) or anywhere leads are created/selected

**Current**: Auto-complete likely requires multiple characters  
**New**: Trigger `.ilike()` search after first character (length >= 1)

**Implementation**:
- Input onChange: Call search function if value.length >= 1
- Query existing leads by name/phone/email
- Show dropdown with matching leads immediately

---

### TIER 3: Venue & Calendar Features

#### Feature 3.1: Display Venue Amenities
Show amenity checkboxes in venue management:

**Venue Edit Form** (VenueDetailTabs):
- Add fieldset with 4 checkboxes: Elevator, Parking, Accessible, Public Transport
- Submit updates has_elevator, has_parking, is_accessible, has_public_transport columns

**Venue Detail/Card View**:
- Display amenities as small icons or badge chips (e.g., 🛗 Elevator, 🅿️ Parking, ♿ Accessible, 🚌 Public Transport)
- Show only amenities that are true (has_elevator = true shows elevator badge)

---

#### Feature 3.2: Calendar — Visual Distinction for Booked Dates
Update calendar component to visually mark occupied dates:

**Options** (choose one):
- Option A: Gray out / mute booked date cells
- Option B: Add a small lock icon 🔒 or calendar icon 📅
- Option C: Different background color for booked dates (e.g., light gray)

**Implementation**:
- Use `eventPropGetter` hook in react-big-calendar
- Apply custom CSS class to events on booked dates
- Ensure visual distinction is clear and accessible (not color-only)

---

#### Feature 3.3: Browse Venues Without Date Selection
Allow viewing venues without being forced to select a date first:

**Use Cases**:
- User wants to browse all venues before committing to a date
- From event creation flow: "View all venues" quick link

**Implementation**:
- Booking wizard: Make date optional (or add skip button) before showing venues
- Optional new component: `VenueBrowser` — simple page showing all active venues with details, no date filter
- Keep existing date-filtered venue selection for when user HAS chosen a date

---

#### Feature 3.4: Shabbat Selection — Back Button
Ensure users can navigate back from Shabbat selection:

**Current Issue**: After selecting "Shabbat" event type, might be hard to go back and select a different type

**Fix**: Add clear back button to booking wizard that always allows going to previous step
- Ensure back button is visible when event type is being selected
- Preserve form state when navigating back

---

### TIER 4: Board/Dashboard Features

#### Feature 4.1: Pending Status Visibility
Show leads in pending state on board/dashboard even after events are created:

**Issue**: After a lead gets converted to an event, "pending" status might disappear from board

**Fix**:
- Lead inquiries with status "considering" or "waiting_for_date" remain visible on board
- If a lead has a booking, show both: pending inquiry badge AND the booked event
- Example badge: 🟡 Pending (Venue A) — Event Booked (Venue B)

---

#### Feature 4.2: Hebrew Calendar Date on Board
Display Hebrew (Jewish calendar) date alongside Gregorian date:

**Where**:
- Event cards on board/dashboard
- Calendar date displays
- Event detail view

**Format**: "5 בדצמבר (14 Kislev)" or similar

**Implementation**:
- Install Hebrew calendar library (e.g., `hebrew-calendar`)
- Add helper function to convert Gregorian → Hebrew date
- Display in EventCard and related components

---

#### Feature 4.3: Statistics — Pending Halls Count
Add to lead statistics section:

**New stat**: "⏳ Awaiting confirmation: X halls"
- Count lead_inquiries where status = 'considering' or 'waiting_for_date'
- Grouped by lead

---

### TIER 5: Event Details & Polish

#### Feature 5.1: Event Detail — Full Notes & Booking Timeline
Update event detail view to show:

1. **Booking date**: "Event booked on: [booking_date]"
2. **All notes**: Full notes field (editable by admin)
3. **Inquiry history**: How we got here (lead name → inquiry sent to Venue X → booking confirmed)
4. **Event metadata**: Date, type, purpose, capacity, price, discount, final price

**Implementation**:
- Event detail modal/page: Query event + linked lead + lead_inquiries
- Show booking_date prominently (distinguishing from created_at)

---

#### Feature 5.2: Google Maps Integration
Add Google Maps link/embed to venue locations:

**Where**:
- Venue detail page
- Event detail page (show venue on map)
- Booking wizard step 4 (venue preview)

**Implementation Options**:
1. Auto-generate map URL: `https://maps.google.com/?q=[address]` (link)
2. Embed iframe: `https://maps.google.com/maps/embed?q=[address]`
3. Add optional `maps_url` column to venues for custom maps

**Code**: Add to VenueDetailTabs, EventDetail, VenueCard components

---

## Database Migrations Checklist

Create these Supabase migrations in `supabase/migrations/`:

- [ ] `010_lead_inquiries.sql` — Create lead_inquiries table with status + rejection_reason
- [ ] `011_venue_amenities.sql` — Add has_elevator, has_parking, is_accessible, has_public_transport to venues
- [ ] `012_event_booking_date.sql` — Add booking_date to events
- [ ] Update RLS policies for lead_inquiries (admin can read all, users limited access)

---

## Components to Create/Modify

### New Components
- [ ] `src/app/(app)/leads/[id]/page.tsx` — Lead detail page
- [ ] `src/components/leads/LeadTimeline.tsx` — Inquiry + booking timeline view
- [ ] `src/components/venues/VenueBrowser.tsx` — Browse all venues (optional, Tier 3)
- [ ] `src/lib/hebrew-calendar.ts` — Helper to convert dates to Hebrew

### Modified Components
- [ ] `src/components/leads/LeadsManager.tsx` — Add search/filter UI
- [ ] `src/app/(app)/leads/LeadsContent.tsx` — Update query to use lead_inquiries
- [ ] `src/components/venues/VenueDetailTabs.tsx` — Add amenities checkboxes
- [ ] `src/components/venues/VenueCard.tsx` — Show amenity badges
- [ ] `src/components/calendar/CalendarComponent.tsx` — Style booked dates
- [ ] `src/components/events/EventCard.tsx` — Add Hebrew date display
- [ ] `src/components/events/EventDetail.tsx` — Add booking_date + notes + maps
- [ ] `src/app/(app)/booking/BookingWizard.tsx` — Create lead_inquiry on completion
- [ ] `src/types/database.ts` — Add LeadInquiryRow type

---

## Implementation Order (Recommended 4-Sprint Plan)

### Sprint 1: Database & Core Types
1. Create lead_inquiries migration
2. Add venue amenities migration
3. Add event booking_date migration
4. Update database.ts with new types

### Sprint 2: Lead Management
1. Lead detail page + timeline view
2. Lead search/filter UI
3. First-character autocomplete
4. Update booking wizard to create lead_inquiry

### Sprint 3: Venue & Calendar Visuals
1. Venue amenities display (edit + view)
2. Calendar booked dates styling
3. Browse venues without date (optional)

### Sprint 4: Polish & Board
1. Event detail enhancements (booking_date, notes, maps)
2. Hebrew dates on board
3. Pending visibility on board
4. Statistics updates

---

## Key Notes for Implementation

### RTL & Internationalization
- All new UI must respect RTL (use `dir="rtl"` and Tailwind RTL utilities)
- Hebrew text for amenity labels, status labels, etc.
- Date format always DD/MM/YYYY

### Data Integrity
- When booking wizard completes: Create event AND create/update lead_inquiry record
- lead_inquiries status should never be null (default to 'considering')
- Ensure lead + venue_id combination is unique (UNIQUE constraint)

### Queries & Performance
- lead_inquiries queries should include lead data (name, phone, email)
- Debounce search inputs in lead/venue filters
- Use Supabase indexes on frequently queried columns (lead_id, venue_id, status)

### Role-Based Access
- Admins: See all leads and inquiries
- Secretaries: See leads they created
- Venue owners: See leads/inquiries for their venues only
- Update RLS policies accordingly

### Email Considerations
- When lead_inquiry is created with rejection status, should we send "Sorry, venue unavailable" email?
- When booking confirmed, should we link to the inquiry?
- Check existing email templates in `src/lib/email/templates/`

---

## Files to Expect Changes In

```
supabase/migrations/
  010_lead_inquiries.sql
  011_venue_amenities.sql
  012_event_booking_date.sql

src/types/
  database.ts (add LeadInquiryRow)

src/app/(app)/
  leads/
    page.tsx (updated)
    [id]/page.tsx (new)
  venues/
    [id]/VenueDetailContent.tsx (updated)
    VenuesContent.tsx (updated)
  events/
    EventsContent.tsx (updated)
  booking/
    BookingWizard.tsx (updated)
  calendar/
    CalendarComponent.tsx (updated)

src/components/
  leads/
    LeadsManager.tsx (updated)
    LeadTimeline.tsx (new)
  venues/
    VenueDetailTabs.tsx (updated)
    VenueCard.tsx (updated)
    VenueBrowser.tsx (new)
  events/
    EventCard.tsx (updated)
    EventDetail.tsx (updated)

src/lib/
  hebrew-calendar.ts (new helper)
```

---

## Questions to Clarify (If Unclear)

1. Should users be able to browse venues without logging in? (VenueBrowser is for logged-in users only, assumed)
2. Do we want to send emails when a lead inquiry is created? When rejected?
3. Should deleted leads also delete their inquiries? (ASSUME: Yes, CASCADE delete)
4. For "browse venues without date": Should this be a separate public page or only for logged-in users?
5. Hebrew date format preference: "14 Kislev" or "14 כסליו"?

---

## Acceptance Criteria

For each feature, confirm:
- [ ] Database migration runs without errors
- [ ] TypeScript types are added/updated
- [ ] New UI follows RTL + existing Tailwind patterns
- [ ] Existing features still work (regression test)
- [ ] Data correctly persists and queries return expected results
- [ ] Amenity checkboxes save and display correctly
- [ ] Lead inquiry tracking works end-to-end (inquiry created → status updated → timeline shows)
- [ ] Calendar visually shows booked dates
- [ ] Lead detail page shows complete history
- [ ] Lead search filters work with all 3 fields (name, phone, email)
