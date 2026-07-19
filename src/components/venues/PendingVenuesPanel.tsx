"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { VenueRow } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

export function PendingVenuesPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPendingVenues();
  }, [supabase]);

  async function loadPendingVenues() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("venues")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVenues(data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message :
                      (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: unknown }).message) :
                      'Unknown error';
      toast.error("שגיאה בטעינת אולמות: " + message);
    } finally {
      setLoading(false);
    }
  }

  async function approveVenue(venueId: string) {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("venues")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", venueId);

      if (error) throw error;
      toast.success("האולם אושר בהצלחה");
      setSelectedVenue(null);
      await loadPendingVenues();
    } catch (err) {
      const message = err instanceof Error ? err.message :
                      (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: unknown }).message) :
                      'Unknown error';
      toast.error("שגיאה באישור האולם: " + message);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectVenue(venueId: string) {
    if (!rejectionReason.trim()) {
      toast.error("יש להקליד סיבה לדחייה");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from("venues")
        .update({
          approval_status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", venueId);

      if (error) throw error;
      toast.success("האולם דחה בהצלחה");
      setSelectedVenue(null);
      setRejectionReason("");
      await loadPendingVenues();
    } catch (err) {
      const message = err instanceof Error ? err.message :
                      (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: unknown }).message) :
                      'Unknown error';
      toast.error("שגיאה בדחיית האולם: " + message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">אולמות ממתינים לאישור</h2>
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">אולמות ממתינים לאישור</h2>
        <p className="text-muted-foreground">אין אולמות הממתינים לאישור</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">אולמות ממתינים לאישור ({venues.length})</h2>
        <Button onClick={loadPendingVenues} variant="outline" size="sm">
          רענן
        </Button>
      </div>

      <div className="space-y-2 border rounded-lg divide-y">
        {venues.map((venue) => (
          <div key={venue.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{venue.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {venue.address}, {venue.city}
                  {venue.neighborhood ? ` - ${venue.neighborhood}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {venue.max_capacity} אורחים
                  </Badge>
                  {venue.price_morning && (
                    <Badge variant="outline" className="text-xs">
                      בוקר: {formatCurrency(venue.price_morning)}
                    </Badge>
                  )}
                  {venue.price_evening && (
                    <Badge variant="outline" className="text-xs">
                      ערב: {formatCurrency(venue.price_evening)}
                    </Badge>
                  )}
                  {venue.price_full_day && (
                    <Badge variant="outline" className="text-xs">
                      יום מלא: {formatCurrency(venue.price_full_day)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedVenue(venue)}
                >
                  צפה פרטים
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedVenue} onOpenChange={(open) => !open && setSelectedVenue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedVenue?.name}</DialogTitle>
          </DialogHeader>
          {selectedVenue && (
            <DialogBody>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">פרטים כלליים</h4>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                    <div><span className="text-muted-foreground">כתובת:</span> {selectedVenue.address}</div>
                    <div><span className="text-muted-foreground">עיר:</span> {selectedVenue.city}</div>
                    {selectedVenue.neighborhood && (
                      <div><span className="text-muted-foreground">שכונה:</span> {selectedVenue.neighborhood}</div>
                    )}
                    <div><span className="text-muted-foreground">קיבולת:</span> {selectedVenue.max_capacity} אורחים</div>
                  </div>
                </div>

                {selectedVenue.description_short && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">תיאור קצר</h4>
                    <p className="text-sm">{selectedVenue.description_short}</p>
                  </div>
                )}

                {selectedVenue.description_long && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">תיאור מפורט</h4>
                    <p className="text-sm">{selectedVenue.description_long}</p>
                  </div>
                )}

                {(selectedVenue.price_morning ||
                  selectedVenue.price_evening ||
                  selectedVenue.price_full_day ||
                  selectedVenue.price_shabbat) && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">מחירון</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedVenue.price_morning && (
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground">בוקר</p>
                          <p className="font-semibold">{formatCurrency(selectedVenue.price_morning)}</p>
                        </div>
                      )}
                      {selectedVenue.price_evening && (
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground">ערב</p>
                          <p className="font-semibold">{formatCurrency(selectedVenue.price_evening)}</p>
                        </div>
                      )}
                      {selectedVenue.price_full_day && (
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground">יום מלא</p>
                          <p className="font-semibold">{formatCurrency(selectedVenue.price_full_day)}</p>
                        </div>
                      )}
                      {selectedVenue.price_shabbat && (
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground">שבת</p>
                          <p className="font-semibold">{formatCurrency(selectedVenue.price_shabbat)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">דחייה (אם בחרת)</h4>
                  <Textarea
                    placeholder="הסבר מדוע אתה דוחה אולם זה (יישלח לבעל האולם)"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedVenue(null)}
                    disabled={actionLoading}
                  >
                    ביטול
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectVenue(selectedVenue.id)}
                    disabled={actionLoading || !rejectionReason.trim()}
                  >
                    דחה
                  </Button>
                  <Button
                    onClick={() => approveVenue(selectedVenue.id)}
                    disabled={actionLoading}
                  >
                    אשר
                  </Button>
                </div>
              </div>
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
