"use client";

import { Button } from "@/components/ui/button";
import { VenueDetailPreview } from "@/components/venues/VenueDetailPreview";
import type { VenueRow, VenueImageRow, EventType } from "@/types/database";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

interface Step4Props {
  venue: VenueWithImages;
  eventType: EventType;
  isAdmin?: boolean;
  onBook: () => void;
  onBack: () => void;
}

export function Step4VenueDetail({ venue, eventType, isAdmin, onBook, onBack }: Step4Props) {
  return (
    <div className="max-w-5xl w-full flex flex-col min-h-full">
      <div className="flex-1">
        <VenueDetailPreview venue={venue} images={venue.images} eventType={eventType} isAdmin={isAdmin} />
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1 mt-6 flex gap-3">
        <Button onClick={onBook} className="w-32">המשך</Button>
        <Button variant="outline" onClick={onBack}>חזור</Button>
      </div>
    </div>
  );
}
