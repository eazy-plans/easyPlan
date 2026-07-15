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
  | "cancelled"
  | "too_expensive"
  | "not_relevant";

export type EmailType =
  | "owner_event_created"
  | "client_confirm"
  | "reminder"
  | "waitlist_notify"
  | "event_cancelled";

export type VenueApprovalStatus = "pending" | "approved" | "rejected";

export type EmailStatus = "sent" | "failed";

export type LeadInquiryStatus =
  | "considering"
  | "too_expensive"
  | "not_relevant"
  | "not_interested"
  | "booked"
  | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
// Row types (what you get back from SELECT queries)
//
// These are `type` aliases, not interfaces, on purpose: postgrest-js
// constrains rows to Record<string, unknown>, which interfaces don't satisfy
// (no implicit index signature). With interfaces the whole Database generic
// silently degraded and every query needed an `as any`.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type VenueRow = {
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
  has_elevator: boolean;
  has_parking: boolean;
  is_accessible: boolean;
  has_public_transport: boolean;
  owner_user_id: string;
  is_active: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  cancellation_policy: string | null;
  approval_status: VenueApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  lat: number | null;
  lng: number | null;
  coords_approximate: boolean;
  created_at: string;
};

export type VenueImageRow = {
  id: string;
  venue_id: string;
  storage_path: string;
  is_primary: boolean;
  created_at: string;
};

export type EventRow = {
  id: string;
  venue_id: string;
  date: string;
  event_type: EventType;
  event_purpose: EventPurpose;
  status: EventStatus;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  price_listed: number;
  discount_amount: number;
  price_final: number;
  notes: string | null;
  booking_date: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  refund_date: string | null;
  original_price_final: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadVenueInterestRow = {
  id: string;
  lead_id: string;
  venue_id: string;
  created_at: string;
};

export type BookingLockRow = {
  id: string;
  venue_id: string;
  date: string;
  event_type: EventType;
  locked_by_user_id: string;
  locked_until: string;
  created_at: string;
};

export type EmailLogRow = {
  id: string;
  event_id: string;
  recipient_email: string;
  email_type: EmailType;
  sent_at: string;
  status: EmailStatus;
};

export type WaitlistRow = {
  id: string;
  lead_id: string;
  venue_id: string;
  requested_date: string;
  created_at: string;
};

export type LeadInquiryRow = {
  id: string;
  lead_id: string;
  venue_id: string;
  status: LeadInquiryStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Database generic type, hand-maintained to match supabase/migrations (no
// supabase CLI on this machine to run `supabase gen types`). Keep in sync:
// - Insert marks defaulted/nullable columns optional
// - Update is Partial<Row> (matches generated output)
// - Relationships power embedded-join inference, e.g. venue:venues(name)
// ─────────────────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      venues: {
        Row: VenueRow;
        Insert: {
          id?: string;
          name: string;
          address: string;
          city: string;
          neighborhood?: string | null;
          max_capacity: number;
          price_morning?: number | null;
          price_evening?: number | null;
          price_full_day?: number | null;
          price_shabbat?: number | null;
          description_short?: string | null;
          description_long?: string | null;
          parking_info?: string | null;
          public_transport_info?: string | null;
          hours_morning_start?: string | null;
          hours_morning_end?: string | null;
          hours_evening_start?: string | null;
          hours_evening_end?: string | null;
          hours_full_start?: string | null;
          hours_full_end?: string | null;
          hours_shabbat_start?: string | null;
          hours_shabbat_end?: string | null;
          has_elevator?: boolean;
          has_parking?: boolean;
          is_accessible?: boolean;
          has_public_transport?: boolean;
          owner_user_id: string;
          is_active?: boolean;
          contact_name?: string | null;
          contact_phone?: string | null;
          cancellation_policy?: string | null;
          approval_status?: VenueApprovalStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          lat?: number | null;
          lng?: number | null;
          coords_approximate?: boolean;
          created_at?: string;
        };
        Update: Partial<VenueRow>;
        Relationships: [
          {
            foreignKeyName: "venues_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "venues_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      venue_images: {
        Row: VenueImageRow;
        Insert: {
          id?: string;
          venue_id: string;
          storage_path: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<VenueImageRow>;
        Relationships: [
          {
            foreignKeyName: "venue_images_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: EventRow;
        Insert: {
          id?: string;
          venue_id: string;
          date: string;
          event_type: EventType;
          event_purpose: EventPurpose;
          status?: EventStatus;
          client_name: string;
          client_phone: string;
          client_email?: string | null;
          price_listed?: number;
          discount_amount?: number;
          price_final?: number;
          notes?: string | null;
          booking_date?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          refund_amount?: number | null;
          refund_date?: string | null;
          original_price_final?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: LeadRow;
        Insert: {
          id?: string;
          client_name: string;
          client_phone?: string | null;
          client_email?: string | null;
          status?: LeadStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<LeadRow>;
        Relationships: [];
      };
      lead_venue_interests: {
        Row: LeadVenueInterestRow;
        Insert: {
          id?: string;
          lead_id: string;
          venue_id: string;
          created_at?: string;
        };
        Update: Partial<LeadVenueInterestRow>;
        Relationships: [
          {
            foreignKeyName: "lead_venue_interests_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_venue_interests_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_inquiries: {
        Row: LeadInquiryRow;
        Insert: {
          id?: string;
          lead_id: string;
          venue_id: string;
          status?: LeadInquiryStatus;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<LeadInquiryRow>;
        Relationships: [
          {
            foreignKeyName: "lead_inquiries_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_inquiries_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_locks: {
        Row: BookingLockRow;
        Insert: {
          id?: string;
          venue_id: string;
          date: string;
          event_type: EventType;
          locked_by_user_id: string;
          locked_until: string;
          created_at?: string;
        };
        Update: Partial<BookingLockRow>;
        Relationships: [
          {
            foreignKeyName: "booking_locks_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_locks_locked_by_user_id_fkey";
            columns: ["locked_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: EmailLogRow;
        Insert: {
          id?: string;
          event_id: string;
          recipient_email: string;
          email_type: EmailType;
          sent_at?: string;
          status?: EmailStatus;
        };
        Update: Partial<EmailLogRow>;
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: WaitlistRow;
        Insert: {
          id?: string;
          lead_id: string;
          venue_id: string;
          requested_date: string;
          created_at?: string;
        };
        Update: Partial<WaitlistRow>;
        Relationships: [
          {
            foreignKeyName: "waitlist_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      acquire_booking_lock: {
        Args: {
          p_venue_id: string;
          p_date: string;
          p_event_type: EventType;
          p_minutes?: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};
