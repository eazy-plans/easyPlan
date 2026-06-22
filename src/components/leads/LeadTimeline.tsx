"use client";

import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LeadRow, LeadInquiryStatus, EventRow } from "@/types/database";

interface LeadInquiry {
  id: string;
  status: LeadInquiryStatus;
  rejection_reason: string | null;
  created_at: string;
  venue: { id: string; name: string } | null;
}

interface Event extends EventRow {
  venue: { id: string; name: string } | null;
}

interface LeadTimelineProps {
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

export function LeadTimeline({ lead, inquiries, events }: LeadTimelineProps) {
  const totalInquiries = inquiries.length;
  const bookedCount = events.length;
  const conversionRate = totalInquiries > 0 ? Math.round((bookedCount / totalInquiries) * 100) : 0;

  const statusCounts = inquiries.reduce(
    (acc, inq) => {
      acc[inq.status] = (acc[inq.status] || 0) + 1;
      return acc;
    },
    {} as Record<LeadInquiryStatus, number>
  );

  return (
    <div className="space-y-8">
      {/* Lead Header */}
      <div className="bg-card border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">{lead.client_name}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">טלפון</p>
            <p className="font-medium" dir="ltr">{lead.client_phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">מייל</p>
            <p className="font-medium text-sm" dir="ltr">{lead.client_email || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">תאריך הוספה</p>
            <p className="font-medium">{formatDate(new Date(lead.created_at))}</p>
          </div>
        </div>
        {lead.notes && (
          <div className="mt-4 p-3 bg-muted rounded">
            <p className="text-sm text-muted-foreground mb-1">הערות</p>
            <p className="text-sm">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">סה"כ בירורים</p>
          <p className="text-3xl font-bold">{totalInquiries}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">הזמנות מאושרות</p>
          <p className="text-3xl font-bold">{bookedCount}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">שיעור הזמנה</p>
          <p className="text-3xl font-bold">{conversionRate}%</p>
        </div>
      </div>

      {/* Status Breakdown */}
      {totalInquiries > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">חלוקה לפי סטטוס</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="p-3 bg-muted rounded text-center">
                <p className="text-sm text-muted-foreground">{INQUIRY_STATUS_LABELS[status as LeadInquiryStatus]}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inquiries Timeline */}
      {inquiries.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">בירורים</h2>
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <div key={inquiry.id} className="border rounded p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium">{inquiry.venue?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(new Date(inquiry.created_at))}</p>
                  </div>
                  <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status]}>
                    {INQUIRY_STATUS_LABELS[inquiry.status]}
                  </Badge>
                </div>
                {inquiry.rejection_reason && (
                  <p className="text-sm text-muted-foreground mt-2">סיבה: {inquiry.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Events */}
      {events.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">הזמנות מאושרות</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right px-4 py-2 font-semibold">אולם</th>
                  <th className="text-right px-4 py-2 font-semibold">תאריך</th>
                  <th className="text-right px-4 py-2 font-semibold">סוג</th>
                  <th className="text-right px-4 py-2 font-semibold">מחיר סופי</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted">
                    <td className="px-4 py-3">{event.venue?.name || "-"}</td>
                    <td className="px-4 py-3">{formatDate(new Date(event.date))}</td>
                    <td className="px-4 py-3">{event.event_type}</td>
                    <td className="px-4 py-3" dir="ltr">{event.price_final}₪</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {inquiries.length === 0 && events.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">אין בירורים או הזמנות עדיין</p>
        </div>
      )}
    </div>
  );
}
