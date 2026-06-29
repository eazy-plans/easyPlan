"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LeadRow, LeadInquiryStatus, EventRow } from "@/types/database";

interface LeadInquiry {
  id: string;
  status: LeadInquiryStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  venue: { id: string; name: string } | null;
}

interface Event extends EventRow {
  venue: { id: string; name: string } | null;
}

interface LeadDetailTabsProps {
  lead: LeadRow;
  inquiries: LeadInquiry[];
  events: Event[];
}

const INQUIRY_STATUS_LABELS: Record<LeadInquiryStatus, string> = {
  considering: "בשיקול",
  too_expensive: "יקר מדי",
  not_relevant: "לא רלוונטי",
  not_interested: "לא מעוניין",
  booked: "הוזמן",
  cancelled: "בוטל",
};

const INQUIRY_STATUS_VARIANT: Record<LeadInquiryStatus, "default" | "secondary" | "outline" | "destructive"> = {
  considering: "secondary",
  too_expensive: "outline",
  not_relevant: "outline",
  not_interested: "outline",
  booked: "default",
  cancelled: "destructive",
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  morning: "בוקר",
  evening: "ערב",
  full_day: "יום מלא",
  shabbat: "שבת",
};

export function LeadDetailTabs({ lead, inquiries, events }: LeadDetailTabsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"inquiries" | "events">("inquiries");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.client_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">סוג: ליד</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowRight className="h-4 w-4 ml-2" />
            חזור
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">טלפון</p>
            <p className="font-medium text-base" dir="ltr">{lead.client_phone || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">מייל</p>
            <p className="font-medium text-sm" dir="ltr">{lead.client_email || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">תאריך הוספה</p>
            <p className="font-medium">{formatDate(new Date(lead.created_at))}</p>
            <p className="text-xs text-muted-foreground">{toHebrewDateShort(lead.created_at)}</p>
          </div>
        </div>

        {lead.notes && (
          <div className="mt-6 p-4 bg-muted rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">הערות</p>
            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab("inquiries")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              tab === "inquiries"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            בירורים ({inquiries.length})
          </button>
          <button
            onClick={() => setTab("events")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              tab === "events"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            הזמנות ({events.length})
          </button>
        </div>

        {/* Inquiries Tab */}
        {tab === "inquiries" && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">אין בירורים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-base">{inquiry.venue?.name || "-"}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(new Date(inquiry.created_at))} • {toHebrewDateShort(inquiry.created_at)}
                        </p>
                      </div>
                      <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status]}>
                        {INQUIRY_STATUS_LABELS[inquiry.status]}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">סטטוס</p>
                        <p>{INQUIRY_STATUS_LABELS[inquiry.status]}</p>
                      </div>

                      {inquiry.rejection_reason && (
                        <div>
                          <p className="text-muted-foreground">סיבת דחייה</p>
                          <p>{inquiry.rejection_reason}</p>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                        <span>נוצר: {formatDate(new Date(inquiry.created_at))}</span>
                        <span>עודכן: {formatDate(new Date(inquiry.updated_at))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">אין הזמנות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => router.push(`/events/${event.id}`)}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-base">{event.venue?.name || "-"}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(new Date(event.date))} • {toHebrewDateShort(event.date)}
                        </p>
                      </div>
                      <Badge variant="default">
                        {EVENT_STATUS_LABELS[event.event_type] || event.event_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">סוג אירוע</p>
                        <p>{EVENT_STATUS_LABELS[event.event_type] || event.event_type}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">מטרה</p>
                        <p>{event.event_purpose}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">מחיר</p>
                        <p dir="ltr">{event.price_final}₪</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">הנחה</p>
                        <p dir="ltr">{event.discount_amount}₪</p>
                      </div>
                    </div>

                    {event.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <p className="text-muted-foreground mb-1">הערות:</p>
                        <p>{event.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                      {event.booking_date && <span>הוזמן: {formatDate(new Date(event.booking_date))}</span>}
                      <span>נוצר: {formatDate(new Date(event.created_at))}</span>
                      {event.cancelled_at && (
                        <span className="text-destructive">בוטל: {formatDate(new Date(event.cancelled_at))}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
