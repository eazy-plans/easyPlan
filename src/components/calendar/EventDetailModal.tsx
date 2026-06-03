/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { EventRow, EventStatus } from "@/types/database";
import { formatDate, formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
const STATUS_LABELS: Record<EventStatus, string> = {
  approved: "אושר", cancelled: "בוטל",
};
const STATUS_VARIANTS: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default", cancelled: "secondary",
};

interface EventDetailModalProps {
  event: EventRow;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function EventDetailModal({ event, open, onClose, isAdmin }: EventDetailModalProps) {
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isAdmin && event.status !== "cancelled" && (
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
    </Dialog>
  );
}
