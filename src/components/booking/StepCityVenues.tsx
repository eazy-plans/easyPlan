"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import Image from "next/image";
import type { VenueRow, VenueImageRow } from "@/types/database";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

interface StepCityVenuesProps {
  onSelect: (venue: VenueWithImages) => void;
  onBack: () => void;
}

export function StepCityVenues({ onSelect, onBack }: StepCityVenuesProps) {
  const [city, setCity] = useState("");
  const [venues, setVenues] = useState<VenueWithImages[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!city.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await (supabase.from("venues") as any)
      .select("*, images:venue_images(*)")
      .eq("is_active", true)
      .ilike("city", `%${city.trim()}%`)
      .order("name");
    setVenues(data ?? []);
    setLoading(false);
    setSearched(true);
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">חיפוש לפי עיר</Label>
          <div className="flex gap-2">
            <Input
              placeholder="הכנס שם עיר..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
            />
            <Button onClick={handleSearch} disabled={!city.trim() || loading}>
              {loading ? "מחפש..." : "חפש"}
            </Button>
          </div>
        </div>

        {searched && !loading && (
          venues.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <Building2 size={40} strokeWidth={1} />
              <p>לא נמצאו אולמות ב{city}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{venues.length} אולמות נמצאו</p>
              {venues.map((venue) => {
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
          )
        )}
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <Button variant="outline" onClick={onBack} className="w-full">חזור לבחירת סוג חיפוש</Button>
      </div>
    </div>
  );
}
