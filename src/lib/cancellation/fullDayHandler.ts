import type { EventRow, EventType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export interface ConflictingSlot {
  id: string;
  event_type: EventType;
  client_name: string;
  price_final: number;
}

export async function getConflictingSlots(
  event: EventRow,
  venueId: string
): Promise<ConflictingSlot[]> {
  const supabase = createClient();

  if (event.event_type === "full_day") {
    // When cancelling full_day, check for morning and evening on same date
    const { data, error } = await supabase
      .from("events")
      .select("id, event_type, client_name, price_final")
      .eq("venue_id", venueId)
      .eq("date", event.date)
      .in("event_type", ["morning", "evening"])
      .in("status", ["approved"])
      .neq("id", event.id);

    if (error) {
      console.error("Error fetching conflicting slots:", error);
      return [];
    }

    return data || [];
  } else if (event.event_type === "morning" || event.event_type === "evening") {
    // When cancelling morning/evening, check for full_day on same date
    const { data, error } = await supabase
      .from("events")
      .select("id, event_type, client_name, price_final")
      .eq("venue_id", venueId)
      .eq("date", event.date)
      .eq("event_type", "full_day")
      .in("status", ["approved"])
      .neq("id", event.id);

    if (error) {
      console.error("Error fetching conflicting slots:", error);
      return [];
    }

    return data || [];
  }

  return [];
}

export async function getConflictingSummary(
  event: EventRow,
  venueId: string
): Promise<string> {
  const conflicts = await getConflictingSlots(event, venueId);

  if (conflicts.length === 0) {
    return "";
  }

  if (event.event_type === "full_day") {
    const types = conflicts.map((c) => c.event_type === "morning" ? "בוקר" : "ערב").join(" ו");
    return `אזהרה: קיימות הזמנות עבור ${types} באותו התאריך. בטול של יום מלא לא יבטל את ההזמנות הללו באופן אוטומטי.`;
  }

  const typeLabel = event.event_type === "morning" ? "בוקר" : "ערב";
  return `אזהרה: קיימת הזמנת יום מלא באותו התאריך. בטול ${typeLabel} לא יבטל את היום המלא.`;
}

export function shouldOfferFullDayCancellation(eventType: EventType): boolean {
  return eventType === "full_day";
}

export function shouldOfferSlotCancellation(eventType: EventType): boolean {
  return eventType === "morning" || eventType === "evening";
}
