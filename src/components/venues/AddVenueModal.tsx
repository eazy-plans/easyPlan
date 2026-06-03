"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { VenueForm } from "./VenueForm";
import type { UserRow } from "@/types/database";

interface AddVenueModalProps {
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
}

export function AddVenueModal({ owners }: AddVenueModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} className="ml-2" />
        אולם חדש
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת אולם חדש</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VenueForm owners={owners} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
