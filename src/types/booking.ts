import type { EventType, EventPurpose, VenueRow } from "./database";

export const PRICE_KEY: Record<EventType, keyof VenueRow> = {
  morning: "price_morning",
  evening: "price_evening",
  full_day: "price_full_day",
  shabbat: "price_shabbat",
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
