"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { VenueForm } from "./VenueForm";
import { VenueEventsPanel } from "./VenueEventsPanel";
import { VenueStatsPanel } from "./VenueStatsPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VenueRow, UserRow, VenueImageRow, EventRow } from "@/types/database";

type Tab = "events" | "stats" | "edit";

interface Props {
  venue: VenueRow;
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  images: VenueImageRow[];
  events: EventRow[];
  /** All-time non-cancelled event count - events only covers the recent history window. */
  allTimeCount: number;
  userId: string;
  isAdmin: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "events", label: "אירועים" },
  { id: "stats",  label: "סטטיסטיקות" },
  { id: "edit",   label: "עריכה" },
];

export function VenueDetailTabs({ venue, owners, images, events, allTimeCount, userId, isAdmin }: Props) {
  const [tab, setTab] = useState<Tab>("events");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function deleteVenue() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("venues").delete().eq("id", venue.id);
    setDeleting(false);
    if (error) {
      // events.venue_id is ON DELETE RESTRICT - a venue with bookings can't
      // be removed, only deactivated.
      if (error.code === "23503") {
        toast.error("לא ניתן למחוק אולם שיש לו אירועים. ניתן לסמן אותו כלא פעיל בעריכה.");
      } else {
        toast.error("שגיאה במחיקת האולם");
      }
      return;
    }
    toast.success(`האולם "${venue.name}" נמחק`);
    router.push("/venues");
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 bg-background border-b px-4 sm:px-6">
        {/* Back + title row */}
        <div className="flex items-center gap-3 pt-3 pb-2">
          <Link
            href="/venues"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors shrink-0"
            title="חזרה לאולמות"
          >
            <ArrowRight size={16} className="text-muted-foreground" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight truncate">{venue.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
              {venue.address ? ` · ${venue.address}` : ""}
            </p>
            {(venue.contact_name || venue.contact_phone) && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                איש קשר: {venue.contact_name}
                {venue.contact_name && venue.contact_phone ? " · " : ""}
                {venue.contact_phone && (
                  <a href={`tel:${venue.contact_phone}`} dir="ltr" className="hover:underline">
                    {venue.contact_phone}
                  </a>
                )}
              </p>
            )}
          </div>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive shrink-0 gap-1.5"
                  disabled={deleting}
                >
                  <Trash2 size={15} />
                  מחק אולם
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>מחיקת אולם</AlertDialogTitle>
                  <AlertDialogDescription>
                    האולם &quot;{venue.name}&quot; יימחק לצמיתות מהמערכת, כולל התמונות והפניות שלו.
                    לא ניתן לבטל פעולה זו.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteVenue}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    מחק
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {/* Tab bar */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="border-b-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="px-5 py-2">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-area px-4 sm:px-6 py-4 pb-6">
        {tab === "events" && (
          <VenueEventsPanel
            venueId={venue.id}
            initialEvents={events}
            userId={userId}
            isAdmin={isAdmin}
          />
        )}

        {tab === "stats" && (
          <VenueStatsPanel events={events} allTimeCount={allTimeCount} />
        )}

        {tab === "edit" && (
          <VenueForm venue={venue} owners={owners} initialImages={images} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
