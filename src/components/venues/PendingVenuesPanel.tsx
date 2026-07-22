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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueRow } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Building2, Inbox } from "lucide-react";

export function PendingVenuesPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
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
                      'שגיאה לא ידועה';
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
                      'שגיאה לא ידועה';
      toast.error("שגיאה באישור האולם: " + message);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectVenue(venueId: string) {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("venues")
        .update({
          approval_status: "rejected",
        })
        .eq("id", venueId);

      if (error) throw error;
      toast.success("האולם דחה בהצלחה");
      setSelectedVenue(null);
      await loadPendingVenues();
    } catch (err) {
      const message = err instanceof Error ? err.message :
                      (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: unknown }).message) :
                      'שגיאה לא ידועה';
      toast.error("שגיאה בדחיית האולם: " + message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          אולמות ממתינים לאישור {!loading && `(${venues.length})`}
        </CardTitle>
        <Button onClick={loadPendingVenues} variant="ghost" size="sm">
          רענן
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">טוען...</p>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
            <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">אין אולמות הממתינים לאישור</p>
          </div>
        ) : (
      <div className="divide-y divide-border/60">
        {venues.map((venue) => (
          <div key={venue.id} className="px-2 py-3 hover:bg-muted/60 rounded-lg transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{venue.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {venue.address}, {venue.city}
                  {venue.neighborhood ? ` - ${venue.neighborhood}` : ""}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
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
        )}
      </CardContent>

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
                    disabled={actionLoading}
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
    </Card>
  );
}
