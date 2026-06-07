export type UserRole = "admin" | "secretary" | "venue_owner";

export type EventType = "morning" | "evening" | "full_day" | "shabbat";

export type EventPurpose =
  | "wedding"
  | "bar_mitzvah"
  | "bat_mitzvah"
  | "birthday"
  | "conference"
  | "other";

export type EventStatus = "approved" | "cancelled";

export type LeadStatus =
  | "new"
  | "considering"
  | "waiting_for_date"
  | "date_taken"
  | "booked"
  | "cancelled";

export type EmailType = "owner_event_created" | "client_confirm" | "reminder";

export type EmailStatus = "sent" | "failed";

// ─────────────────────────────────────────────────────────────────────────────
// Row types (what you get back from SELECT queries)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface VenueRow {
  id: string;
  name: string;
  address: string;
  city: string;
  neighborhood: string | null;
  max_capacity: number;
  price_morning: number | null;
  price_evening: number | null;
  price_full_day: number | null;
  price_shabbat: number | null;
  description_short: string | null;
  description_long: string | null;
  parking_info: string | null;
  public_transport_info: string | null;
  hours_morning_start: string | null;
  hours_morning_end: string | null;
  hours_evening_start: string | null;
  hours_evening_end: string | null;
  hours_full_start: string | null;
  hours_full_end: string | null;
  hours_shabbat_start: string | null;
  hours_shabbat_end: string | null;
  owner_user_id: string;
  is_active: boolean;
  created_at: string;
}

export interface VenueImageRow {
  id: string;
  venue_id: string;
  storage_path: string;
  is_primary: boolean;
  created_at: string;
}

export interface EventRow {
  id: string;
  venue_id: string;
  date: string;
  event_type: EventType;
  event_purpose: EventPurpose;
  status: EventStatus;
  client_name: string;
  client_phone: string;
  client_email: string;
  price_listed: number;
  discount_amount: number;
  price_final: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadVenueInterestRow {
  id: string;
  lead_id: string;
  venue_id: string;
  created_at: string;
}

export interface BookingLockRow {
  id: string;
  venue_id: string;
  date: string;
  event_type: EventType;
  locked_by_user_id: string;
  locked_until: string;
  created_at: string;
}

export interface EmailLogRow {
  id: string;
  event_id: string;
  recipient_email: string;
  email_type: EmailType;
  sent_at: string;
  status: EmailStatus;
}

export interface WaitlistRow {
  id: string;
  lead_id: string;
  venue_id: string;
  requested_date: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database generic type (will be replaced by `supabase gen types` output)
// ─────────────────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Omit<UserRow, "created_at">; Update: Partial<Omit<UserRow, "id" | "created_at">> };
      venues: { Row: VenueRow; Insert: Omit<VenueRow, "id" | "created_at">; Update: Partial<Omit<VenueRow, "id" | "created_at">> };
      venue_images: { Row: VenueImageRow; Insert: Omit<VenueImageRow, "id" | "created_at">; Update: Partial<Omit<VenueImageRow, "id" | "created_at">> };
      events: { Row: EventRow; Insert: Omit<EventRow, "id" | "created_at" | "updated_at">; Update: Partial<Omit<EventRow, "id" | "created_at">> };
      leads: { Row: LeadRow; Insert: Omit<LeadRow, "id" | "created_at" | "updated_at">; Update: Partial<Omit<LeadRow, "id" | "created_at">> };
      lead_venue_interests: { Row: LeadVenueInterestRow; Insert: Omit<LeadVenueInterestRow, "id" | "created_at">; Update: never };
      booking_locks: { Row: BookingLockRow; Insert: Omit<BookingLockRow, "id" | "created_at">; Update: never };
      email_logs: { Row: EmailLogRow; Insert: Omit<EmailLogRow, "id">; Update: never };
      waitlist: { Row: WaitlistRow; Insert: Omit<WaitlistRow, "id" | "created_at">; Update: never };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
