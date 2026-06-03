"use client";

import { useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { VenueDetailModal } from "./VenueDetailModal";
import { VenueEditModal } from "./VenueEditModal";
import type { VenueRow, UserRow } from "@/types/database";

interface VenuesTableProps {
  venues: VenueRow[];
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  isAdmin?: boolean;
  isVenueOwner?: boolean;
}

export function VenuesTable({ venues, owners, isAdmin = false, isVenueOwner = false }: VenuesTableProps) {
  const canEdit = isAdmin || isVenueOwner;
  const [detailVenue, setDetailVenue] = useState<VenueRow | null>(null);
  const [editVenue, setEditVenue] = useState<VenueRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function deleteVenue(venue: VenueRow) {
    setDeleting(venue.id);
    const supabase = createClient();
    const { error } = await (supabase.from("venues") as any).delete().eq("id", venue.id);
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
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם האולם</TableHead>
              <TableHead>עיר</TableHead>
              <TableHead>קיבולת</TableHead>
              <TableHead>מחיר ערב</TableHead>
              <TableHead>סטטוס</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow
                key={venue.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setDetailVenue(venue)}
              >
                <TableCell className="font-medium">{venue.name}</TableCell>
                <TableCell>{venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}</TableCell>
                <TableCell>{venue.max_capacity} אורחים</TableCell>
                <TableCell>
                  {venue.price_evening ? formatCurrency(Number(venue.price_evening)) : "—"}
                </TableCell>
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
                      {isAdmin && <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={deleting === venue.id}
                          >
                            מחק
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>מחיקת אולם</AlertDialogTitle>
                            <AlertDialogDescription>
                              האולם &quot;{venue.name}&quot; יימחק לצמיתות. לא ניתן לבטל פעולה זו.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVenue(venue)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              מחק
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detailVenue && (
        <VenueDetailModal
          venue={detailVenue}
          open
          onOpenChange={(open) => { if (!open) setDetailVenue(null); }}
        />
      )}

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
