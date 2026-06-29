/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EventFormModal } from "./EventFormModal";
import type { EventRow, EventStatus } from "@/types/database";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";

interface EventWithCreator extends EventRow {
  creator?: { full_name: string } | null;
  cancelled_by_user?: { full_name: string } | null;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  approved: "אושר", cancelled: "בוטל",
};
const STATUS_VARIANTS: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default", cancelled: "secondary",
};


type LeadCard = { id: string };

interface EventDetailModalProps {
  event: EventWithCreator;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  canCancel?: boolean;
  userId?: string;
  venueAddress?: string;
  venueCity?: string;
}

export function EventDetailModal({ event, open, onClose, isAdmin, canCancel, userId = "", venueAddress, venueCity }: EventDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [leadState, setLeadState] = useState<"loading" | "found" | "not_found">("loading");
  const [lead, setLead] = useState<LeadCard | null>(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) fetchLead();
  }, [open]);

  async function cancelEvent() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await (supabase.from("events") as any)
      .update({ status: "cancelled" })
      .eq("id", event.id);
    setLoading(false);

    if (error) { toast.error("שגיאה בעדכון הסטטוס"); return; }
    toast.success("האירוע בוטל");
    onClose();
  }

  async function deleteEvent() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await (supabase.from("events") as any).delete().eq("id", event.id);
    setLoading(false);

    if (error) {
      toast.error("שגיאה במחיקת האירוע");
      return;
    }
    toast.success("האירוע נמחק");
    onClose();
  }

  async function fetchLead() {
    setLeadState("loading");
    const supabase = createClient();
    const { data } = await (supabase.from("leads") as any)
      .select("id")
      .eq("client_phone", event.client_phone)
      .maybeSingle();

    if (data) {
      setLead(data);
      setLeadState("found");
    } else {
      setLeadState("not_found");
    }
  }

  async function createLeadFromEvent() {
    setCreatingLead(true);
    const supabase = createClient();
    const { data, error } = await (supabase.from("leads") as any)
      .insert({
        client_name: event.client_name,
        client_phone: event.client_phone,
        client_email: event.client_email,
        status: "booked",
      })
      .select("id")
      .single();
    if (error) { toast.error("שגיאה ביצירת ליד"); setCreatingLead(false); return; }
    // Add venue interest
    await (supabase.from("lead_venue_interests") as any)
      .insert({ lead_id: data.id, venue_id: event.venue_id })
      .then(() => null).catch(() => null);
    setCreatingLead(false);
    // Re-fetch to get venue name in interests
    fetchLead();
    toast.success("הליד נוצר");
  }

  function handleClose() {
    setLeadState("loading");
    setLead(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formatDate(event.date)}
            <Badge variant={STATUS_VARIANTS[event.status]}>
              {STATUS_LABELS[event.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
        <div className="space-y-3 text-sm">
          {event.booking_date && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">הוזמן ב</span>
              <span>{formatDate(new Date(event.booking_date))}</span>
            </div>
          )}

          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">תאריך</span>
            <div className="flex flex-col">
              <span>{formatDate(event.date)}</span>
              <span className="text-xs text-muted-foreground">{toHebrewDateShort(event.date)}</span>
            </div>
          </div>

          {(venueAddress || venueCity) && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">מיקום</span>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${venueAddress || ""} ${venueCity || ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                📍 פתח במפה
              </a>
            </div>
          )}

          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">סוג אירוע</span>
            <span className="font-medium">{EVENT_TYPE_LABELS[event.event_type]}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">מהות</span>
            <span className="font-medium">{EVENT_PURPOSE_LABELS[event.event_purpose]}</span>
          </div>

          <Separator />

          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">לקוח</span>
            <span className="font-medium">{event.client_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">טלפון</span>
            <span dir="ltr">{event.client_phone}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">מייל</span>
            <span dir="ltr">{event.client_email}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-24 shrink-0" />
            {leadState === "loading" && (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40 border-t-transparent animate-spin" />
            )}
            {leadState === "found" && lead && (
              <Button size="sm" variant="link" className="h-auto p-0 text-xs"
                onClick={() => { handleClose(); router.push(`/leads?q=${encodeURIComponent(event.client_phone)}`); }}>
                פתח ברשימת לידים ←
              </Button>
            )}
            {leadState === "not_found" && (
              <Button size="sm" variant="link" className="h-auto p-0 text-xs" disabled={creatingLead} onClick={createLeadFromEvent}>
                {creatingLead ? "יוצר..." : "+ צור ליד"}
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">מחיר מחירון</span>
            <span>{formatCurrency(Number(event.price_listed))}</span>
          </div>
          {Number(event.discount_amount) > 0 && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">הנחה</span>
              <span className="text-destructive">−{formatCurrency(Number(event.discount_amount))}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">מחיר סופי</span>
            <span className="font-bold">{formatCurrency(Number(event.price_final))}</span>
          </div>

          {event.notes && (
            <>
              <Separator />
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24 shrink-0">הערות</span>
                <span>{event.notes}</span>
              </div>
            </>
          )}

          <Separator />

          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 shrink-0">נוצר ב</span>
            <span>{formatDate(new Date(event.created_at))}</span>
          </div>

          {event.creator?.full_name && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">יוצר</span>
              <span>{event.creator.full_name}</span>
            </div>
          )}

          {event.updated_at && event.created_at !== event.updated_at && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">עודכן ב</span>
              <span>{formatDate(new Date(event.updated_at))}</span>
            </div>
          )}

          {event.status === "cancelled" && event.cancelled_at && (
            <>
              <Separator />
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24 shrink-0">בוטל ב</span>
                <span>{formatDate(new Date(event.cancelled_at))}</span>
              </div>
              {event.cancelled_by_user?.full_name && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">בוטל על ידי</span>
                  <span>{event.cancelled_by_user.full_name}</span>
                </div>
              )}
              {event.cancellation_reason && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">סיבה</span>
                  <span>{event.cancellation_reason}</span>
                </div>
              )}
            </>
          )}

        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isAdmin && event.status !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              ערוך
            </Button>
          )}
          {(isAdmin || canCancel) && event.status !== "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEvent}
              disabled={loading}
            >
              בטל אירוע
            </Button>
          )}

          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive mr-auto" disabled={loading}>
                  מחק
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>מחיקת אירוע</AlertDialogTitle>
                  <AlertDialogDescription>
                    האירוע של {event.client_name} ב-{formatDate(event.date)} יימחק לצמיתות.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-white hover:bg-destructive/90">
                    מחק
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        </DialogBody>
      </DialogContent>

      <EventFormModal
        open={editOpen}
        onClose={() => { setEditOpen(false); onClose(); }}
        date={new Date(event.date)}
        venueId={event.venue_id}
        userId={userId}
        isAdmin={isAdmin}
        event={event}
      />
    </Dialog>
  );
}
