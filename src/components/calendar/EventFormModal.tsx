/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EventType, EventPurpose, EventRow } from "@/types/database";
import { formatDate, isValidPhone } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  venueId: string;
  userId: string;
  isAdmin: boolean;
  event?: EventRow;
  onSaved?: () => void;
}

export function EventFormModal({ open, onClose, date, venueId, userId, isAdmin, event, onSaved }: EventFormModalProps) {
  const isEdit = !!event;
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const eventTypeRef = useRef<HTMLButtonElement>(null);
  const eventPurposeRef = useRef<HTMLButtonElement>(null);
  const clientNameRef = useRef<HTMLInputElement>(null);
  const clientPhoneRef = useRef<HTMLInputElement>(null);
  const clientEmailRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    event_type: "" as EventType | "",
    event_purpose: "" as EventPurpose | "",
    client_name: "",
    client_phone: "",
    client_email: "",
    price_listed: "",
    discount_amount: "0",
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({ event_type: "", event_purpose: "", client_name: "", client_phone: "", client_email: "", price_listed: "", discount_amount: "0", notes: "" });
      setPhoneError("");
      return;
    }
    if (event) {
      setForm({
        event_type: event.event_type,
        event_purpose: event.event_purpose,
        client_name: event.client_name,
        client_phone: event.client_phone,
        client_email: event.client_email,
        price_listed: String(event.price_listed),
        discount_amount: String(event.discount_amount),
        notes: event.notes ?? "",
      });
    }
  }, [open, event]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "client_phone") setPhoneError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.event_type) {
      toast.error("יש לבחור סוג אירוע");
      eventTypeRef.current?.focus();
      return;
    }
    if (!form.event_purpose) {
      toast.error("יש לבחור מהות אירוע");
      eventPurposeRef.current?.focus();
      return;
    }
    if (!form.client_name.trim()) {
      toast.error("יש להזין שם לקוח");
      clientNameRef.current?.focus();
      return;
    }
    if (!isValidPhone(form.client_phone)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 052-1234567)");
      clientPhoneRef.current?.focus();
      return;
    }
    if (!form.client_email.trim()) {
      toast.error("יש להזין כתובת מייל");
      clientEmailRef.current?.focus();
      return;
    }

    const listed = parseFloat(form.price_listed) || 0;
    const discount = parseFloat(form.discount_amount) || 0;

    setLoading(true);
    const supabase = createClient();

    const payload = {
      event_type: form.event_type,
      event_purpose: form.event_purpose,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      price_listed: listed,
      discount_amount: isAdmin ? discount : 0,
      price_final: listed - (isAdmin ? discount : 0),
      notes: form.notes || null,
    };

    let error: { message: string } | null = null;

    if (isEdit && event) {
      ({ error } = await (supabase.from("events") as any).update(payload).eq("id", event.id));
    } else {
      ({ error } = await (supabase.from("events") as any).insert({
        ...payload,
        venue_id: venueId,
        date: date.toISOString().split("T")[0],
        status: "approved",
        created_by: userId,
      }));
    }

    setLoading(false);

    if (error) {
      if (error.message.includes("events_slot_unique") || error.message.includes("full_day")) {
        toast.error("התאריך והחלון הזמן כבר תפוסים");
      } else {
        toast.error("שגיאה בשמירת האירוע: " + error.message);
      }
      return;
    }

    toast.success(isEdit ? "האירוע עודכן בהצלחה" : "האירוע נוסף בהצלחה");
    onSaved?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `עריכת אירוע - ${formatDate(new Date(event!.date))}` : `הוספת אירוע - ${formatDate(date)}`}</DialogTitle>
        </DialogHeader>
        <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>סוג אירוע *</Label>
              <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
                <SelectTrigger ref={eventTypeRef} dir="rtl"><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>מהות האירוע *</Label>
              <Select value={form.event_purpose} onValueChange={(v) => set("event_purpose", v)}>
                <SelectTrigger ref={eventPurposeRef} dir="rtl"><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {(Object.entries(EVENT_PURPOSE_LABELS) as [EventPurpose, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>שם הלקוח *</Label>
              <Input ref={clientNameRef} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>טלפון *</Label>
              <Input ref={clientPhoneRef} type="tel" dir="ltr" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} className={phoneError ? "border-destructive" : ""} placeholder="052-1234567" />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>
            <div className="space-y-1">
              <Label>מייל *</Label>
              <Input ref={clientEmailRef} type="email" dir="ltr" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>מחיר מחירון (₪)</Label>
              <Input type="number" min="0" value={form.price_listed} onChange={(e) => set("price_listed", e.target.value)} placeholder="0" />
            </div>
            {isAdmin && (
              <div className="space-y-1">
                <Label>הנחה (₪)</Label>
                <Input type="number" min="0" value={form.discount_amount} onChange={(e) => set("discount_amount", e.target.value)} placeholder="0" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>הערות</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading}>{loading ? "שומר..." : isEdit ? "עדכן אירוע" : "שמור אירוע"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
          </div>
        </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
