import type { EventType, EventPurpose, VenueRow, VenueImageRow } from "./database";

export const PRICE_KEY: Record<EventType, keyof VenueRow> = {
  morning: "price_morning",
  evening: "price_evening",
  full_day: "price_full_day",
  shabbat: "price_shabbat",
};

export interface BookingState {
  // Step 1
  date: Date | null;
  event_type: EventType | null;
  // Step 2
  filter_city: string;
  filter_neighborhood: string;
  filter_min_capacity: string;
  filter_max_price: string;
  // Step 3 → 4
  selected_venue: (VenueRow & { images: VenueImageRow[] }) | null;
  // Step 5
  client_name: string;
  client_phone: string;
  client_email: string;
  event_purpose: EventPurpose | null;
  price_listed: number;
  discount_amount: number;
  notes: string;
}

export const INITIAL_BOOKING_STATE: BookingState = {
  date: null,
  event_type: null,
  filter_city: "",
  filter_neighborhood: "",
  filter_min_capacity: "",
  filter_max_price: "",
  selected_venue: null,
  client_name: "",
  client_phone: "",
  client_email: "",
  event_purpose: null,
  price_listed: 0,
  discount_amount: 0,
  notes: "",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  morning: "בוקר",
  evening: "ערב",
  full_day: "יום מלא",
  shabbat: "שבת",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  morning: "#3b82f6",  // blue-500
  evening: "#8b5cf6",  // violet-500
  full_day: "#22c55e", // green-500
  shabbat:  "#f97316", // orange-500
};

export const EVENT_PURPOSE_LABELS: Record<EventPurpose, string> = {
  wedding: "חתונה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  birthday: "יום הולדת",
  conference: "כנס / אירוע עסקי",
  other: "אחר",
};
