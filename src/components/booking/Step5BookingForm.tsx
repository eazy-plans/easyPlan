/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, isValidPhone, toLocalDateStr } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS, PRICE_KEY } from "@/types/booking";
import type { EventType, EventPurpose, VenueRow } from "@/types/database";

type ClientSuggestion = { client_name: string; client_phone: string; client_email: string };

function SuggestionDropdown({ suggestions, onSelect }: { suggestions: ClientSuggestion[]; onSelect: (s: ClientSuggestion) => void }) {
  return (
    <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-lg shadow-md max-h-40 overflow-y-auto">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          className="w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors block"
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
        >
          <span className="font-medium">{s.client_name}</span>
          <span className="text-muted-foreground mr-2 text-xs" dir="ltr">{s.client_phone}</span>
        </button>
      ))}
    </div>
  );
}

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
  const [secondsLeft, setSecondsLeft] = useState(600);

  const [suggestions, setSuggestions] = useState<{ client_name: string; client_phone: string; client_email: string }[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSearch(field: string, value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 1) { setSuggestions([]); setActiveField(null); return; }
    searchTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await (supabase.from("leads") as any)
        .select("client_name, client_phone, client_email")
        .ilike(field, `%${value}%`)
        .limit(5);
      if (data && data.length > 0) { setSuggestions(data); setActiveField(field); }
      else { setSuggestions([]); setActiveField(null); }
    }, 300);
  }

  function applySuggestion(s: { client_name: string; client_phone: string; client_email: string }) {
    setForm((f) => ({ ...f, client_name: s.client_name, client_phone: s.client_phone, client_email: s.client_email ?? f.client_email }));
    setSuggestions([]);
    setActiveField(null);
    setPhoneError("");
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "client_phone") setPhoneError("");
    if (field === "client_name" || field === "client_phone" || field === "client_email") {
      triggerSearch(field, value);
    }
  }

  const discount = parseFloat(form.discount_amount) || 0;
  const finalPrice = Math.max(0, listedPrice - (isAdmin ? discount : 0));

  // Acquire booking lock on mount
  useEffect(() => {
    const supabase = createClient();

    async function acquireLock() {
      // Atomic acquire via the acquire_booking_lock RPC - the old client-side
      // check-then-upsert let two users pass the check simultaneously and the
      // second one silently stole the lock. Errors are ignored (the lock is
      // best-effort; events_slot_unique is the real double-booking guard).
      const { data: acquired, error } = await (supabase.rpc as any)("acquire_booking_lock", {
        p_venue_id: venue.id,
        p_date: toLocalDateStr(date),
        p_event_type: eventType,
      });

      if (!error && acquired === false) {
        setLockError("התאריך נעול כרגע על ידי מזכירה אחרת. נסה שוב בעוד כמה דקות.");
      }
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
        .eq("date", toLocalDateStr(date))
        .eq("event_type", eventType)
        .eq("locked_by_user_id", userId)
        .then(() => null)
        .catch(() => null);
    };
  // Empty deps: lock must be acquired once for the slot chosen in earlier steps and
  // released on unmount. Props are frozen by the wizard - they never change while this
  // step is mounted, so stale-closure is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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
      date: toLocalDateStr(date),
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
      booking_date: new Date().toISOString(),
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

    // Upsert lead by phone - fire-and-forget
    (async () => {
      const { data: existing } = await (supabase.from("leads") as any)
        .select("id")
        .eq("client_phone", form.client_phone)
        .maybeSingle();

      let leadId: string;
      if (existing) {
        await (supabase.from("leads") as any).update({ status: "booked" }).eq("id", existing.id);
        leadId = existing.id;
      } else {
        const { data: newLead } = await (supabase.from("leads") as any)
          .insert({ client_name: form.client_name, client_phone: form.client_phone, client_email: form.client_email || null, status: "booked" })
          .select("id").single();
        if (!newLead) return;
        leadId = newLead.id;
      }
      await (supabase.from("lead_venue_interests") as any)
        .upsert({ lead_id: leadId, venue_id: venue.id }, { onConflict: "lead_id,venue_id" })
        .then(() => null).catch(() => null);

      await (supabase.from("lead_inquiries") as any)
        .upsert({ lead_id: leadId, venue_id: venue.id, status: "booked" }, { onConflict: "lead_id,venue_id" })
        .then(() => null).catch(() => null);
    })().catch(() => null);

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
          <div className="flex flex-col gap-0.5 items-end">
            <div className="flex gap-2 w-full justify-between"><span className="text-muted-foreground">תאריך:</span><span className="font-medium">{formatDate(date)}</span></div>
            <span className="text-xs text-muted-foreground">{toHebrewDateShort(date)}</span>
          </div>
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

        <div className="grid grid-cols-2 gap-4" ref={clientRef} dir="rtl">
          {/* Name */}
          <div className="space-y-1 col-span-2 relative" dir="rtl">
            <Label>שם הלקוח *</Label>
            <Input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              onFocus={() => activeField !== "client_name" && suggestions.length > 0 && setActiveField("client_name")}
              required
              dir="rtl"
            />
            {activeField === "client_name" && suggestions.length > 0 && (
              <SuggestionDropdown suggestions={suggestions} onSelect={applySuggestion} />
            )}
          </div>
          {/* Phone */}
          <div className="space-y-1 relative" dir="rtl">
            <Label>טלפון *</Label>
            <Input
              type="tel"
              dir="ltr"
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
              onFocus={() => activeField !== "client_phone" && suggestions.length > 0 && setActiveField("client_phone")}
              className={phoneError ? "border-destructive" : ""}
              placeholder="052-1234567"
            />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            {activeField === "client_phone" && suggestions.length > 0 && (
              <SuggestionDropdown suggestions={suggestions} onSelect={applySuggestion} />
            )}
          </div>
          {/* Email */}
          <div className="space-y-1 relative">
            <Label>מייל *</Label>
            <Input
              type="email"
              dir="ltr"
              value={form.client_email}
              onChange={(e) => set("client_email", e.target.value)}
              onFocus={() => activeField !== "client_email" && suggestions.length > 0 && setActiveField("client_email")}
              required
            />
            {activeField === "client_email" && suggestions.length > 0 && (
              <SuggestionDropdown suggestions={suggestions} onSelect={applySuggestion} />
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-muted rounded-lg p-3 space-y-2 text-sm" dir="rtl">
          <div className="flex justify-between">
            <span className="text-muted-foreground">מחיר מחירון</span>
            <span>{formatCurrency(listedPrice)}</span>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between gap-4" dir="rtl">
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

        {/* Cancellation Policy */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2" dir="rtl">
          <div className="flex items-start gap-2">
            <div className="text-amber-700 font-medium text-sm">📋 מדיניות ביטול</div>
          </div>
          <p className="text-xs text-amber-800 whitespace-pre-wrap">
            {venue.cancellation_policy?.trim() || "לא הוגדרה מדיניות ביטול לאולם זה. לפרטים יש לפנות לאולם."}
          </p>
          <p className="text-xs text-amber-700 font-medium">
            בעת ביטול ההזמנה, ההחזר יטופל לפי מדיניות זו.
          </p>
        </div>

        <div className="space-y-1" dir="rtl">
          <Label>הערות</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} dir="rtl" />
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
