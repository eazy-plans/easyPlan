"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search } from "lucide-react";
import Image from "next/image";
import type { VenueRow, VenueImageRow } from "@/types/database";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

interface StepVenueSearchProps {
  onSelect: (venue: VenueWithImages) => void;
  onBack: () => void;
}

export function StepVenueSearch({ onSelect, onBack }: StepVenueSearchProps) {
  const [query, setQuery] = useState("");
  const [allVenues, setAllVenues] = useState<VenueWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (supabase.from("venues") as any)
      .select("*, images:venue_images(*)")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => {
        setAllVenues(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = query.trim()
    ? allVenues.filter(
        (v) =>
          v.name.toLowerCase().includes(query.toLowerCase()) ||
          v.city.toLowerCase().includes(query.toLowerCase())
      )
    : allVenues;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חפש לפי שם אולם..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9"
            autoFocus
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">טוען אולמות...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
            <Building2 size={40} strokeWidth={1} />
            <p>לא נמצאו אולמות</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{filtered.length} אולמות</p>
            {filtered.map((venue) => {
              const primaryImage = venue.images.find((i) => i.is_primary) ?? venue.images[0];
              return (
                <div
                  key={venue.id}
                  className="border rounded-lg p-4 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelect(venue)}
                >
                  <div className="w-16 h-16 rounded-md bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {primaryImage ? (
                      <Image
                        src={getImageUrl(primaryImage.storage_path)}
                        alt={venue.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 size={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{venue.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{venue.max_capacity} אורחים</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <Button variant="outline" onClick={onBack} className="w-full">חזור לבחירת סוג חיפוש</Button>
      </div>
    </div>
  );
}
