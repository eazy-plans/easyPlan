"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow, LeadInquiryStatus, EventRow, VenueRow } from "@/types/database";
import { EVENT_PURPOSE_LABELS } from "@/types/booking";

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

const INQUIRY_STATUSES: LeadInquiryStatus[] = ["considering", "too_expensive", "not_relevant", "not_interested", "booked", "cancelled"];

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

export function LeadDetailTabs({ lead: initialLead, inquiries: initialInquiries, events }: LeadDetailTabsProps) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [tab, setTab] = useState<"inquiries" | "events" | "statistics">("inquiries");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    client_name: initialLead.client_name,
    client_phone: initialLead.client_phone || "",
    client_email: initialLead.client_email || "",
    notes: initialLead.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [addInquiryOpen, setAddInquiryOpen] = useState(false);
  const [venues, setVenues] = useState<Pick<VenueRow, "id" | "name">[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    venue_id: "",
    status: "considering" as LeadInquiryStatus,
    rejection_reason: "",
  });
  const [savingInquiry, setSavingInquiry] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("leads")
      .update({
        client_name: editForm.client_name,
        client_phone: editForm.client_phone || null,
        client_email: editForm.client_email || null,
        notes: editForm.notes || null,
      })
      .eq("id", lead.id);

    setSaving(false);
    if (error) { toast.error("שגיאה בשמירת שינויים"); return; }
    setLead({
      ...lead,
      client_name: editForm.client_name,
      client_phone: editForm.client_phone || null,
      client_email: editForm.client_email || null,
      notes: editForm.notes || null,
    });
    setEditOpen(false);
    toast.success("הליד עודכן");
    router.refresh();
  }

  async function loadVenues() {
    if (venues.length > 0) return;
    setLoadingVenues(true);
    const supabase = createClient();
    const { data } = await supabase.from("venues").select("id, name").order("name");
    if (data) setVenues(data);
    setLoadingVenues(false);
  }

  async function handleAddInquiry() {
    if (!inquiryForm.venue_id) { toast.error("בחר אולם"); return; }
    setSavingInquiry(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("lead_inquiries")
        .upsert({
          lead_id: lead.id,
          venue_id: inquiryForm.venue_id,
          status: inquiryForm.status,
          rejection_reason: inquiryForm.rejection_reason || null,
        }, { onConflict: "lead_id,venue_id" });

      if (error) {
        console.error("Upsert error:", error);
        toast.error(`שגיאה בהוספת פנייה: ${error.message}`);
        setSavingInquiry(false);
        return;
      }

      const { data: newData } = await supabase.from("lead_inquiries")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("venue_id", inquiryForm.venue_id)
        .single();

      if (newData) {
        const venue = venues.find((v) => v.id === newData.venue_id);
        const inquiryWithVenue: LeadInquiry = {
          ...newData,
          venue: venue ? { id: venue.id, name: venue.name } : null,
        };
        setInquiries((prev) => {
          const exists = prev.find((i) => i.id === newData.id);
          return exists ? prev.map((i) => i.id === newData.id ? inquiryWithVenue : i) : [inquiryWithVenue, ...prev];
        });
      }

      setAddInquiryOpen(false);
      setInquiryForm({ venue_id: "", status: "considering", rejection_reason: "" });
      toast.success("פנייה נוספה");
      router.refresh();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("שגיאה בלתי צפויה בהוספת פנייה");
    } finally {
      setSavingInquiry(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          חזור
        </Button>
      </div>

      {/* Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.client_name}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 ml-2" />
            עריכה
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
            פניות ({inquiries.length})
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
          <button
            onClick={() => setTab("statistics")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              tab === "statistics"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            סטטיסטיקות
          </button>
        </div>

        {/* Inquiries Tab */}
        {tab === "inquiries" && (
          <div className="space-y-4">
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => {
                loadVenues();
                setAddInquiryOpen(true);
              }}
            >
              <Plus className="h-4 w-4 ml-2" />
              הוספת פנייה
            </Button>
            {inquiries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">אין פניות</p>
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
                    className="border rounded-lg p-4"
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

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">סוג אירוע</p>
                        <p>{EVENT_STATUS_LABELS[event.event_type] || event.event_type}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">מטרה</p>
                        <p>{EVENT_PURPOSE_LABELS[event.event_purpose] || event.event_purpose}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">מחיר</p>
                        <p dir="ltr">{event.price_final}₪</p>
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

        {/* Statistics Tab */}
        {tab === "statistics" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">סטטיסטיקות פניות</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground mb-1">סה"כ פניות</p>
                  <p className="font-bold text-lg">{inquiries.length}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-center border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-muted-foreground mb-1">בשיקול</p>
                  <p className="font-bold text-lg">{inquiries.filter((i) => i.status === "considering").length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground mb-1">הוזמן</p>
                  <p className="font-bold text-lg">{inquiries.filter((i) => i.status === "booked").length}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg text-center border border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground mb-1">בוטל</p>
                  <p className="font-bold text-lg">{inquiries.filter((i) => i.status === "cancelled").length}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-muted-foreground mb-1">יקר מדי</p>
                  <p className="font-bold text-lg">{inquiries.filter((i) => i.status === "too_expensive").length}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">סטטיסטיקות אירועים לפי חודש</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const monthlyStats = new Map<string, { total: number; booked: number; cancelled: number; revenue: number }>();
                  events.forEach((event) => {
                    const date = new Date(event.date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const current = monthlyStats.get(key) || { total: 0, booked: 0, cancelled: 0, revenue: 0 };
                    current.total++;
                    if (!event.cancelled_at) current.booked++;
                    if (event.cancelled_at) current.cancelled++;
                    current.revenue += event.price_final || 0;
                    monthlyStats.set(key, current);
                  });

                  if (monthlyStats.size === 0) {
                    return <p className="text-sm text-muted-foreground">אין אירועים</p>;
                  }

                  return Array.from(monthlyStats.entries())
                    .sort()
                    .reverse()
                    .map(([month, stats]) => {
                      const [year, monthNum] = month.split('-');
                      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
                      return (
                        <div key={month} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <p className="font-semibold text-sm mb-2">{monthName}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded text-center">
                              <p className="text-xs text-muted-foreground">סה"כ</p>
                              <p className="font-bold">{stats.total}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950 p-2 rounded text-center">
                              <p className="text-xs text-muted-foreground">הוזמנו</p>
                              <p className="font-bold">{stats.booked}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950 p-2 rounded text-center">
                              <p className="text-xs text-muted-foreground">בוטלו</p>
                              <p className="font-bold">{stats.cancelled}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded text-center">
                              <p className="text-xs text-muted-foreground">הכנסה</p>
                              <p className="font-bold text-xs" dir="ltr">{stats.revenue.toLocaleString('he-IL')}₪</p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת ליד</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="space-y-1">
                <Label>שם לקוח</Label>
                <Input
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>טלפון</Label>
                <Input
                  type="tel"
                  dir="ltr"
                  value={editForm.client_phone}
                  onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })}
                  placeholder="052-1234567"
                />
              </div>
              <div className="space-y-1">
                <Label>מייל</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={editForm.client_email}
                  onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>הערות</Label>
                <Textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "שומר..." : "שמור"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  ביטול
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Add Inquiry Dialog */}
      <Dialog open={addInquiryOpen} onOpenChange={setAddInquiryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת פנייה</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => { e.preventDefault(); handleAddInquiry(); }} className="space-y-4">
              <div className="space-y-1">
                <Label>אולם *</Label>
                <Select value={inquiryForm.venue_id} onValueChange={(v) => setInquiryForm({ ...inquiryForm, venue_id: v })}>
                  <SelectTrigger dir="rtl" disabled={loadingVenues}>
                    <SelectValue placeholder={loadingVenues ? "טוען..." : "בחר אולם"} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Select value={inquiryForm.status} onValueChange={(v) => setInquiryForm({ ...inquiryForm, status: v as LeadInquiryStatus })}>
                  <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {INQUIRY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{INQUIRY_STATUS_LABELS[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(inquiryForm.status === "too_expensive" || inquiryForm.status === "not_relevant" || inquiryForm.status === "not_interested" || inquiryForm.status === "cancelled") && (
                <div className="space-y-1">
                  <Label>סיבת דחייה</Label>
                  <Textarea
                    rows={2}
                    value={inquiryForm.rejection_reason}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, rejection_reason: e.target.value })}
                    placeholder="הסבר את סיבת הדחייה (אופציונלי)"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={savingInquiry} className="flex-1">
                  {savingInquiry ? "שומר..." : "שמור"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAddInquiryOpen(false)}>
                  ביטול
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
