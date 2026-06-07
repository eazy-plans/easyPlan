/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, isValidPhone } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS, PRICE_KEY } from "@/types/booking";
import type { EventType, EventPurpose, VenueRow } from "@/types/database";

interface Step5Props {
  venue: VenueRow;
  date: Date;
  eventType: EventType;
  isAdmin: boolean;
  userId: string;
  onBack: () => void;
  onSuccess: (eventId: string) => void;
}

export function Step5BookingForm({ venue, date, eventType, isAdmin, userId, onBack, onSuccess }: Step5Props) {
  const listedPrice = Number(venue[PRICE_KEY[eventType]] ?? 0);
  const [phoneError, setPhoneError] = useState("");
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    event_purpose: "" as EventPurpose | "",
    discount_amount: "0",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [lockError, setLockError] = useState("");
  // Countdown for lock (10 min)
  const [secondsLeft, setSecondsLeft] = useState(600);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "client_phone") setPhoneError("");
  }

  const discount = parseFloat(form.discount_amount) || 0;
  const finalPrice = Math.max(0, listedPrice - (isAdmin ? discount : 0));

  // Acquire booking lock on mount
  useEffect(() => {
    const supabase = createClient();
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    async function acquireLock() {
      const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date);
      const nowIso = new Date().toISOString();

      // Check if another user holds an active lock on this slot

      const { data: existing } = await (supabase.from("booking_locks") as any)
        .select("locked_by_user_id, locked_until")
        .eq("venue_id", venue.id)
        .eq("date", dateStr)
        .eq("event_type", eventType)
        .gt("locked_until", nowIso)
        .neq("locked_by_user_id", userId)
        .maybeSingle();

      if (existing) {
        setLockError("התאריך נעול כרגע על ידי מזכירה אחרת. נסה שוב בעוד כמה דקות.");
        return;
      }

      // Acquire (or refresh) the lock - ignore errors (RLS / table issues don't block booking)

      await (supabase.from("booking_locks") as any).upsert({
        venue_id: venue.id,
        date: dateStr,
        event_type: eventType,
        locked_by_user_id: userId,
        locked_until: lockedUntil,
      }, { onConflict: "venue_id,date,event_type" });
    }
    acquireLock();

    // Countdown timer
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setLockError("הנעילה פגה. חזור ובחר אולם מחדש.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Release lock on unmount
    return () => {
      clearInterval(interval);

      (supabase.from("booking_locks") as any)
        .delete()
        .eq("venue_id", venue.id)
        .eq("date", new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date))
        .eq("event_type", eventType)
        .eq("locked_by_user_id", userId);
    };
  // Empty deps: lock must be acquired once for the slot chosen in earlier steps and
  // released on unmount. Props are frozen by the wizard - they never change while this
  // step is mounted, so stale-closure is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.event_purpose) { toast.error("יש לבחור מהות האירוע"); return; }
    if (!isValidPhone(form.client_phone)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 052-1234567)");
      return;
    }
    if (secondsLeft === 0) { toast.error("הנעילה פגה, חזור ובחר אולם"); return; }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await (supabase.from("events") as any).insert({
      venue_id: venue.id,
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date),
      event_type: eventType,
      event_purpose: form.event_purpose,
      status: "approved",
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      price_listed: listedPrice,
      discount_amount: isAdmin ? discount : 0,
      price_final: finalPrice,
      notes: form.notes || null,
      created_by: userId,
    }).select("id").single();

    setLoading(false);

    if (error) {
      if (error.message.includes("events_slot_unique") || error.message.includes("full_day")) {
        toast.error("התאריך כבר נתפס בינתיים");
      } else {
        toast.error("שגיאה בשמירת האירוע: " + error.message);
      }
      return;
    }

    // Send emails fire-and-forget
    fetch("/api/events/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.id, type: "owner_event_created" }),
    }).catch(() => null);
    fetch("/api/events/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.id, type: "client_confirm" }),
    }).catch(() => null);

    onSuccess(data.id);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  if (lockError) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{lockError}</div>
        <Button variant="outline" onClick={onBack} className="w-full">חזור לבחירת אולם</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
      <div className="flex-1 space-y-5">
        {/* Lock timer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 flex justify-between items-center">
          <span>האולם שמור לך עוד</span>
          <span className="font-mono font-bold" dir="ltr">{minutes}:{seconds}</span>
        </div>

        {/* Summary */}
        <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
          <div className="flex gap-2"><span className="text-muted-foreground w-20">אולם:</span><span className="font-medium">{venue.name}</span></div>
          <div className="flex gap-2"><span className="text-muted-foreground w-20">תאריך:</span><span className="font-medium">{formatDate(date)}</span></div>
          <div className="flex gap-2"><span className="text-muted-foreground w-20">סוג:</span><span className="font-medium">{EVENT_TYPE_LABELS[eventType]}</span></div>
        </div>

        <div className="space-y-1">
          <Label>מהות האירוע *</Label>
          <Select value={form.event_purpose} onValueChange={(v) => set("event_purpose", v)}>
            <SelectTrigger dir="rtl"><SelectValue placeholder="בחר מהות" /></SelectTrigger>
            <SelectContent dir="rtl">
              {(Object.entries(EVENT_PURPOSE_LABELS) as [EventPurpose, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 col-span-2">
            <Label>שם הלקוח *</Label>
            <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>טלפון *</Label>
            <Input type="tel" dir="ltr" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} className={phoneError ? "border-destructive" : ""} placeholder="052-1234567" />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>
          <div className="space-y-1">
            <Label>מייל *</Label>
            <Input type="email" dir="ltr" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} required />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">מחיר מחירון</span>
            <span>{formatCurrency(listedPrice)}</span>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">הנחה (₪)</span>
              <Input
                type="number" min="0" max={listedPrice}
                value={form.discount_amount}
                onChange={(e) => set("discount_amount", e.target.value)}
                className="h-7 w-28 text-left"
                dir="ltr"
              />
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-2">
            <span>מחיר סופי</span>
            <span>{formatCurrency(finalPrice)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label>הערות</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1 flex gap-3">
        <Button type="submit" disabled={loading || secondsLeft === 0} className="flex-1">
          {loading ? "שומר..." : "שמור"}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>חזור</Button>
      </div>
    </form>
  );
}
