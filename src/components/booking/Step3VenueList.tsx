"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Building2 } from "lucide-react";
import Image from "next/image";
import type { VenueRow, VenueImageRow, EventType } from "@/types/database";
import { PRICE_KEY } from "@/types/booking";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

interface Step3Props {
  venues: VenueWithImages[];
  eventType: EventType;
  onSelect: (venue: VenueWithImages) => void;
  onBack: () => void;
}

export function Step3VenueList({ venues, eventType, onSelect, onBack }: Step3Props) {
  if (venues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Building2 size={48} strokeWidth={1} />
          <p className="text-lg font-medium">אין אולמות פנויים</p>
          <p className="text-sm">נסה תאריך אחר או שנה את הסינון</p>
        </div>
        <Button variant="outline" onClick={onBack} className="w-full">חזור לסינון</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{venues.length} אולמות פנויים נמצאו</p>
      <div className="space-y-3 max-h-[480px] overflow-y-auto">
        {venues.map((venue) => {
          const price = venue[PRICE_KEY[eventType]];
          const primaryImage = venue.images.find((i) => i.is_primary) ?? venue.images[0];

          return (
            <div
              key={venue.id}
              className="border rounded-lg p-4 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(venue)}
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-md bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                {primaryImage ? (
                  <Image
                    src={getImageUrl(primaryImage.storage_path)}
                    alt={venue.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={28} className="text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate">{venue.name}</h3>
                  <Badge variant="outline" className="shrink-0">
                    {venue.max_capacity} אורחים
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                </p>
                {price && (
                  <p className="text-sm font-medium mt-1 text-primary">
                    {formatCurrency(Number(price))}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" onClick={onBack} className="w-full">חזור לסינון</Button>
    </div>
  );
}
