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
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { VenueEditModal } from "./VenueEditModal";
import { VenueDetailPreview } from "./VenueDetailPreview";
import type { VenueRow, VenueImageRow, UserRow } from "@/types/database";
import { Building2, ArrowUpDown, ParkingCircle, Accessibility, Bus, ChevronLeft } from "lucide-react";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const APPROVAL_BADGE: Record<string, { label: string; variant: "warning-soft" | "destructive" }> = {
  pending: { label: "ממתין לאישור", variant: "warning-soft" },
  rejected: { label: "נדחה", variant: "destructive" },
};

function AmenityChips({ venue }: { venue: VenueRow }) {
  const amenities = [
    { on: venue.has_elevator, icon: ArrowUpDown, label: "מעלית" },
    { on: venue.has_parking, icon: ParkingCircle, label: "חנייה" },
    { on: venue.is_accessible, icon: Accessibility, label: "נגישות" },
    { on: venue.has_public_transport, icon: Bus, label: "תחב״צ" },
  ].filter((a) => a.on);
  if (amenities.length === 0) return <span className="text-muted-foreground/50 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {amenities.map(({ icon: Icon, label }) => (
        <span key={label} title={label} className="flex items-center justify-center w-6 h-6 rounded-md bg-muted text-muted-foreground">
          <Icon size={13} />
        </span>
      ))}
    </div>
  );
}

interface VenuesTableProps {
  venues: VenueWithImages[];
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  isAdmin?: boolean;
  isVenueOwner?: boolean;
  /** Secretaries can't reach the admin-only /venues/[id] page, so rows open a read-only preview instead of navigating. */
  isSecretary?: boolean;
}

function DeleteVenueDialog({
  venue,
  disabled,
  onConfirm,
  className,
}: {
  venue: VenueWithImages;
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

export function VenuesTable({ venues, owners, isAdmin = false, isVenueOwner = false, isSecretary = false }: VenuesTableProps) {
  const canEdit = isAdmin || isVenueOwner;
  const [editVenue, setEditVenue] = useState<VenueRow | null>(null);
  const [previewVenue, setPreviewVenue] = useState<VenueWithImages | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  // Secretaries are redirected away from /venues/[id] (admin/owner-only management page),
  // so their click opens a read-only preview instead of navigating there.
  function openVenue(venue: VenueWithImages) {
    if (isSecretary) setPreviewVenue(venue);
    else router.push(`/venues/${venue.id}`);
  }

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
    const { data: { user: actor } } = await supabase.auth.getUser();
    logAudit(supabase, actor?.id ?? null, "venue.delete", "venue", venue.id, { name: venue.name });
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
              <TableHead>אולם</TableHead>
              <TableHead>עיר</TableHead>
              <TableHead>קיבולת</TableHead>
              <TableHead>נוחות</TableHead>
              <TableHead>סטטוס</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow
                key={venue.id}
                className="group cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                onClick={() => openVenue(venue)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") openVenue(venue); }}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 size={16} />
                    </span>
                    {isSecretary ? (
                      <span className="hover:underline">{venue.name}</span>
                    ) : (
                      // Real link so the detail page gets prefetched on hover
                      <Link
                        href={`/venues/${venue.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {venue.name}
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}</TableCell>
                <TableCell>{venue.max_capacity} אורחים</TableCell>
                <TableCell><AmenityChips venue={venue} /></TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={venue.is_active ? "default" : "secondary"}>
                      {venue.is_active ? "פעיל" : "לא פעיל"}
                    </Badge>
                    {APPROVAL_BADGE[venue.approval_status] && (
                      <Badge variant={APPROVAL_BADGE[venue.approval_status].variant}>
                        {APPROVAL_BADGE[venue.approval_status].label}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
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
                      <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
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
            className="border rounded-xl bg-card p-4 space-y-3 shadow-card cursor-pointer hover:border-primary/40 transition-all focus-visible:bg-muted/40 focus-visible:outline-none"
            onClick={() => openVenue(venue)}
            onKeyDown={(e) => { if (e.key === "Enter") openVenue(venue); }}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{venue.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={venue.is_active ? "default" : "secondary"}>
                  {venue.is_active ? "פעיל" : "לא פעיל"}
                </Badge>
                {APPROVAL_BADGE[venue.approval_status] && (
                  <Badge variant={APPROVAL_BADGE[venue.approval_status].variant}>
                    {APPROVAL_BADGE[venue.approval_status].label}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{venue.max_capacity} אורחים</span>
              <AmenityChips venue={venue} />
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

      <Dialog open={!!previewVenue} onOpenChange={(open) => !open && setPreviewVenue(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{previewVenue?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {previewVenue && (
              <VenueDetailPreview venue={previewVenue} images={previewVenue.images} />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
