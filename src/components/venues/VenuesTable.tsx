"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { VenueEditModal } from "./VenueEditModal";
import type { VenueRow, UserRow } from "@/types/database";

interface VenuesTableProps {
  venues: VenueRow[];
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  isAdmin?: boolean;
  isVenueOwner?: boolean;
}

function DeleteVenueDialog({
  venue,
  disabled,
  onConfirm,
  className,
}: {
  venue: VenueRow;
  disabled: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className={`text-destructive ${className ?? ""}`} disabled={disabled}>
          מחק
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת אולם</AlertDialogTitle>
          <AlertDialogDescription>
            האולם &quot;{venue.name}&quot; יימחק לצמיתות. לא ניתן לבטל פעולה זו.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            מחק
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function VenuesTable({ venues, owners, isAdmin = false, isVenueOwner = false }: VenuesTableProps) {
  const canEdit = isAdmin || isVenueOwner;
  const [editVenue, setEditVenue] = useState<VenueRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function deleteVenue(venue: VenueRow) {
    setDeleting(venue.id);
    const supabase = createClient();
    const { error } = await supabase.from("venues").delete().eq("id", venue.id);
    setDeleting(null);
    if (error) {
      if (error.code === "23503") {
        toast.error("לא ניתן למחוק אולם שיש לו אירועים");
      } else {
        toast.error("שגיאה במחיקת האולם");
      }
      return;
    }
    toast.success(`האולם "${venue.name}" נמחק`);
    router.refresh();
  }

  return (
    <>
      {/* Table (desktop) */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם האולם</TableHead>
              <TableHead>עיר</TableHead>
              <TableHead>קיבולת</TableHead>
              <TableHead>סטטוס</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow
                key={venue.id}
                className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                onClick={() => router.push(`/venues/${venue.id}`)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") router.push(`/venues/${venue.id}`); }}
              >
                <TableCell className="font-medium">
                  {/* Real link so the detail page gets prefetched on hover */}
                  <Link
                    href={`/venues/${venue.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {venue.name}
                  </Link>
                </TableCell>
                <TableCell>{venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}</TableCell>
                <TableCell>{venue.max_capacity} אורחים</TableCell>
                <TableCell>
                  <Badge variant={venue.is_active ? "default" : "secondary"}>
                    {venue.is_active ? "פעיל" : "לא פעיל"}
                  </Badge>
                </TableCell>
                {canEdit && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditVenue(venue)}
                      >
                        עריכה
                      </Button>
                      {isAdmin && (
                        <DeleteVenueDialog
                          venue={venue}
                          disabled={deleting === venue.id}
                          onConfirm={() => deleteVenue(venue)}
                        />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {venues.map((venue) => (
          <div
            key={venue.id}
            role="button"
            tabIndex={0}
            className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/40 transition-colors focus-visible:bg-muted/40 focus-visible:outline-none"
            onClick={() => router.push(`/venues/${venue.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter") router.push(`/venues/${venue.id}`); }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{venue.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                </p>
              </div>
              <Badge variant={venue.is_active ? "default" : "secondary"} className="shrink-0">
                {venue.is_active ? "פעיל" : "לא פעיל"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">קיבולת</span>
              <span>{venue.max_capacity} אורחים</span>
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditVenue(venue)}>
                  עריכה
                </Button>
                {isAdmin && (
                  <DeleteVenueDialog
                    venue={venue}
                    disabled={deleting === venue.id}
                    onConfirm={() => deleteVenue(venue)}
                    className="flex-1"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editVenue && (
        <VenueEditModal
          venue={editVenue}
          owners={owners}
          open
          onOpenChange={(open) => { if (!open) setEditVenue(null); }}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
