"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { CHART_GRADIENTS } from "@/lib/chart-colors";
import { ArrowRight, Pencil, Trash2, Plus, Inbox, TrendingUp, PartyPopper, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow, LeadInquiryStatus, EventRow, VenueRow } from "@/types/database";
import { EVENT_PURPOSE_LABELS } from "@/types/booking";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUSES, INQUIRY_STATUS_VARIANT, REJECTION_STATUSES } from "@/types/leads";

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
  /** events RLS only lets admins delete - hide the button for everyone else */
  isAdmin: boolean;
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  morning: "בוקר",
  evening: "ערב",
  full_day: "יום מלא",
  shabbat: "שבת",
};

export function LeadDetailTabs({ lead: initialLead, inquiries: initialInquiries, events: initialEvents, isAdmin }: LeadDetailTabsProps) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [events, setEvents] = useState(initialEvents);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const inquiryStats = useMemo(() => {
    const byStatus = INQUIRY_STATUSES.reduce((acc, status) => {
      acc[status] = inquiries.filter((i) => i.status === status).length;
      return acc;
    }, {} as Record<LeadInquiryStatus, number>);
    const total = inquiries.length;
    const conversion = total > 0 ? Math.round((byStatus.booked / total) * 100) : 0;
    return { byStatus, total, conversion };
  }, [inquiries]);

  const eventStats = useMemo(() => {
    const cancelled = events.filter((e) => e.cancelled_at).length;
    return { active: events.length - cancelled, cancelled };
  }, [events]);

  const monthlyChartData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    events.forEach((event) => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = map.get(key) ?? { count: 0, revenue: 0 };
      current.count++;
      current.revenue += Number(event.price_final ?? 0);
      map.set(key, current);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, stats]) => {
        const [year, month] = key.split("-");
        const name = new Date(Number(year), Number(month) - 1).toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
        return { name, ...stats };
      });
  }, [events]);

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

  async function handleDeleteInquiry(inquiryId: string) {
    setDeletingId(inquiryId);
    const supabase = createClient();
    const { error } = await supabase.from("lead_inquiries").delete().eq("id", inquiryId);
    setDeletingId(null);
    if (error) { toast.error("שגיאה במחיקת הפנייה"); return; }
    setInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
    toast.success("הפנייה נמחקה");
    router.refresh();
  }

  async function handleDeleteEvent(eventId: string) {
    setDeletingId(eventId);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    setDeletingId(null);
    if (error) { toast.error("שגיאה במחיקת ההזמנה"); return; }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast.success("ההזמנה נמחקה");
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Back Button + Header + Tab bar: fixed, only the content below scrolls */}
      <div className="shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 space-y-3">
        <div className="flex justify-start">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowRight className="h-4 w-4 ml-2" />
            חזור
          </Button>
        </div>

        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight">{lead.client_name}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 ml-2" />
              עריכה
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">טלפון</p>
              <p className="font-medium text-sm" dir="ltr">{lead.client_phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">מייל</p>
              <p className="font-medium text-sm" dir="ltr">{lead.client_email || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">תאריך הוספה</p>
              <p className="font-medium text-sm">{formatDate(new Date(lead.created_at))} <span className="text-xs text-muted-foreground">· {toHebrewDateShort(lead.created_at)}</span></p>
            </div>
          </div>

          {lead.notes && (
            <div className="mt-2 p-2 bg-muted rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">הערות</p>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "inquiries" | "events" | "statistics")}>
          <TabsList>
            <TabsTrigger value="inquiries">פניות ({inquiries.length})</TabsTrigger>
            <TabsTrigger value="events">הזמנות ({events.length})</TabsTrigger>
            <TabsTrigger value="statistics">סטטיסטיקות</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-area px-4 sm:px-6 py-4 pb-6 space-y-4">
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
                        {inquiry.venue ? (
                          <Link
                            href={`/venues/${inquiry.venue.id}`}
                            className="font-semibold text-base text-primary hover:underline"
                          >
                            {inquiry.venue.name}
                          </Link>
                        ) : (
                          <p className="font-semibold text-base">-</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(new Date(inquiry.created_at))} • {toHebrewDateShort(inquiry.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status]}>
                          {INQUIRY_STATUS_LABELS[inquiry.status]}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-8 w-8 p-0"
                              disabled={deletingId === inquiry.id}
                              aria-label="מחק פנייה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>מחיקת פנייה</AlertDialogTitle>
                              <AlertDialogDescription>
                                הפנייה לאולם {inquiry.venue?.name || ""} תימחק לצמיתות. לא ניתן לבטל פעולה זו.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ביטול</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteInquiry(inquiry.id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                מחק
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">סטטוס</p>
                        <p>{INQUIRY_STATUS_LABELS[inquiry.status]}</p>
                      </div>

                      {inquiry.rejection_reason && (
                        <div>
                          <p className="text-muted-foreground">
                            {REJECTION_STATUSES.includes(inquiry.status) ? "סיבת דחייה" : "הערה"}
                          </p>
                          <p className="whitespace-pre-wrap">{inquiry.rejection_reason}</p>
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
                    role="button"
                    tabIndex={0}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:bg-muted/50 focus-visible:outline-none"
                    onClick={() => router.push(`/events/${event.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/events/${event.id}`); }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        {event.venue ? (
                          <Link
                            href={`/venues/${event.venue.id}`}
                            className="font-semibold text-base text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.venue.name}
                          </Link>
                        ) : (
                          <p className="font-semibold text-base">-</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(new Date(event.date))} • {toHebrewDateShort(event.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.status === "cancelled" && (
                          <Badge variant="destructive">בוטל</Badge>
                        )}
                        {event.cancellation_requested_at && event.status !== "cancelled" && (
                          <Badge variant="warning-soft">
                            ממתין לביטול
                          </Badge>
                        )}
                        <Badge variant="default">
                          {EVENT_STATUS_LABELS[event.event_type] || event.event_type}
                        </Badge>
                        {isAdmin && (
                          <span onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive h-8 w-8 p-0"
                                  disabled={deletingId === event.id}
                                  aria-label="מחק הזמנה"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>מחיקת הזמנה</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ההזמנה ב{event.venue?.name || "אולם"} בתאריך {formatDate(new Date(event.date))} תימחק לצמיתות.
                                    שים לב: מחיקה עוקפת את תהליך הביטול המסודר (מיילים, רשימת המתנה). לא ניתן לבטל פעולה זו.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    מחק
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        )}
                      </div>
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
                      <span>נוצר: <span dir="ltr">{formatDateTime(event.created_at)}</span></span>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard label="סה״כ פניות" value={inquiryStats.total} icon={Inbox} tone="primary" />
                <StatCard label="שיעור המרה" value={`${inquiryStats.conversion}%`} icon={TrendingUp} tone="violet" />
                <StatCard label="הזמנות פעילות" value={eventStats.active} icon={PartyPopper} tone="success" />
                <StatCard label="הזמנות שבוטלו" value={eventStats.cancelled} icon={XCircle} tone="warning" />
              </div>
              <div className="flex flex-wrap gap-2">
                {INQUIRY_STATUSES.map((status) => (
                  <Badge key={status} variant={INQUIRY_STATUS_VARIANT[status]} className="gap-1.5">
                    {INQUIRY_STATUS_LABELS[status]}
                    <span className="font-bold">{inquiryStats.byStatus[status]}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">אירועים לפי חודש</h3>
              {monthlyChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין אירועים</p>
              ) : (
                <Card variant="elevated">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-base font-semibold">אירועים והכנסות לפי חודש</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={3}>
                        <defs>
                          <linearGradient id="leadEvGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_GRADIENTS.primary.from} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_GRADIENTS.primary.to} stopOpacity={0.85} />
                          </linearGradient>
                          <linearGradient id="leadRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_GRADIENTS.success.from} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_GRADIENTS.success.to} stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={44}
                          tickFormatter={(v) => v === 0 ? "" : `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                        <Bar yAxisId="left" dataKey="count" name="אירועים" fill="url(#leadEvGrad)" radius={[5, 5, 0, 0]} maxBarSize={22} />
                        <Bar yAxisId="right" dataKey="revenue" name="הכנסות" fill="url(#leadRevGrad)" radius={[5, 5, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 mt-3 justify-center">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-3 h-3 rounded-sm bg-primary inline-block" />אירועים
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-3 h-3 rounded-sm bg-success inline-block" />הכנסות
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                <Combobox
                  options={venues.map((venue) => ({ value: venue.id, label: venue.name }))}
                  value={inquiryForm.venue_id}
                  onValueChange={(v) => setInquiryForm({ ...inquiryForm, venue_id: v })}
                  placeholder={loadingVenues ? "טוען..." : "בחר אולם"}
                  disabled={loadingVenues}
                  clearable={false}
                />
              </div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Combobox
                  options={INQUIRY_STATUSES.map((status) => ({ value: status, label: INQUIRY_STATUS_LABELS[status] }))}
                  value={inquiryForm.status}
                  onValueChange={(v) => setInquiryForm({ ...inquiryForm, status: v as LeadInquiryStatus })}
                  placeholder="בחר סטטוס"
                  clearable={false}
                />
              </div>
              <div className="space-y-1">
                <Label>{REJECTION_STATUSES.includes(inquiryForm.status) ? "סיבת דחייה" : "הערה"}</Label>
                <Textarea
                  rows={2}
                  value={inquiryForm.rejection_reason}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, rejection_reason: e.target.value })}
                  placeholder={REJECTION_STATUSES.includes(inquiryForm.status) ? "הסבר את סיבת הדחייה" : "הערות"}
                />
              </div>
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
