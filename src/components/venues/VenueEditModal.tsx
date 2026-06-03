"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { VenueForm } from "./VenueForm";
import type { VenueRow, UserRow } from "@/types/database";

interface VenueEditModalProps {
  venue: VenueRow;
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenueEditModal({ venue, owners, open, onOpenChange }: VenueEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>עריכת אולם — {venue.name}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VenueForm venue={venue} owners={owners} onSuccess={() => onOpenChange(false)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
