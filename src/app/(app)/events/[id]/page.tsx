import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "./BackButton";
import { EVENT_PURPOSE_LABELS } from "@/types/booking";

export const metadata = { title: "פרטי הזמנה" };

const EVENT_STATUS_LABELS: Record<string, string> = {
  morning: "בוקר",
  evening: "ערב",
  full_day: "יום מלא",
  shabbat: "שבת",
};

const EVENT_STATUS_LABELS_FULL: Record<string, string> = {
  approved: "אושר",
  cancelled: "בוטל",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getUserProfile();

  if (!["admin", "secretary", "venue_owner"].includes(profile.role)) {
    redirect("/");
  }

  const { data: event, error } = await supabase.from("events")
    .select("*, venue:venues(id, name, address, city)")
    .eq("id", id)
    .single();

  if (error || !event) {
    notFound();
  }

  // Leads are keyed by phone - link the client straight to their lead card
  // when one exists.
  const { data: lead } = await supabase.from("leads")
    .select("id")
    .eq("client_phone", event.client_phone)
    .maybeSingle();

  return (
    <div className="h-full min-h-0 overflow-y-auto scroll-area">
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6">
      {/* Back Button */}
      <div className="flex justify-start mb-6">
        <BackButton />
      </div>

      {/* Header */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {event.venue?.id ? (
                <Link href={`/venues/${event.venue.id}`} className="hover:underline hover:text-primary transition-colors">
                  {event.venue.name}
                </Link>
              ) : (
                event.venue?.name || "-"
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">סוג: הזמנה</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={event.status === "approved" ? "default" : "destructive"}>
              {EVENT_STATUS_LABELS_FULL[event.status] || event.status}
            </Badge>
            {event.cancellation_requested_at && event.status !== "cancelled" && (
              <Badge variant="warning-soft">
                ממתין לביטול
              </Badge>
            )}
          </div>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">תאריך</p>
              <p className="font-medium">{formatDate(new Date(event.date))}</p>
              <p className="text-xs text-muted-foreground">{toHebrewDateShort(event.date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">סוג אירוע</p>
              <p className="font-medium">{EVENT_STATUS_LABELS[event.event_type] || event.event_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">שם הלקוח</p>
              <p className="font-medium">{event.client_name || "-"}</p>
              {lead && (
                <Link href={`/leads/${lead.id}`} className="text-xs text-primary hover:underline">
                  פתח את כרטיס הליד ←
                </Link>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">טלפון</p>
              <p className="font-medium text-base" dir="ltr">
                {event.client_phone || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">מייל</p>
              <p className="font-medium text-sm" dir="ltr">
                {event.client_email || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">מטרה</p>
              <p className="font-medium">{EVENT_PURPOSE_LABELS[event.event_purpose as keyof typeof EVENT_PURPOSE_LABELS] ?? event.event_purpose}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">מחיר רשום</p>
              <p className="font-medium text-lg" dir="ltr">
                {event.price_listed}₪
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">הנחה</p>
              <p className="font-medium text-lg" dir="ltr">
                {event.discount_amount}₪
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">מחיר סופי</p>
              <p className="font-medium text-lg" dir="ltr">
                {event.price_final}₪
              </p>
            </div>
          </div>

          {event.notes && (
            <div className="mt-6 p-4 bg-muted rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">הערות</p>
              <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">תאריך הזמנה</p>
                <p>{event.booking_date ? formatDate(new Date(event.booking_date)) : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">נוצר ב</p>
                <p dir="ltr" className="text-right">{formatDateTime(event.created_at)}</p>
              </div>
              {event.cancellation_requested_at && event.status !== "cancelled" && (
                <div>
                  <p className="text-muted-foreground mb-1">בקשת ביטול</p>
                  <p dir="ltr" className="text-right text-warning">
                    {formatDateTime(event.cancellation_requested_at)}
                  </p>
                </div>
              )}
              {event.cancelled_at && (
                <>
                  <div>
                    <p className="text-muted-foreground mb-1">תאריך ביטול</p>
                    <p className="text-destructive">{formatDate(new Date(event.cancelled_at))}</p>
                  </div>
                  {event.cancellation_reason && (
                    <div>
                      <p className="text-muted-foreground mb-1">סיבת ביטול</p>
                      <p>{event.cancellation_reason}</p>
                    </div>
                  )}
                  {event.refund_amount !== null && (
                    <div>
                      <p className="text-muted-foreground mb-1">סכום החזר</p>
                      <p dir="ltr">{event.refund_amount}₪</p>
                    </div>
                  )}
                  {event.refund_date && (
                    <div>
                      <p className="text-muted-foreground mb-1">תאריך החזר</p>
                      <p>{formatDate(new Date(event.refund_date))}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {event.venue?.address && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">כתובת</p>
              <p className="font-medium">
                {event.venue.address}, {event.venue.city}
              </p>
            </div>
          )}
        </div>
    </div>
    </div>
  );
}
