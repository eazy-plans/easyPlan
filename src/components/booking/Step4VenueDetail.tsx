"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import type { VenueRow, VenueImageRow, EventType } from "@/types/database";
import { EVENT_TYPE_LABELS } from "@/types/booking";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const PRICE_KEYS: { key: keyof VenueRow; label: string }[] = [
  { key: "price_morning", label: "בוקר" },
  { key: "price_evening", label: "ערב" },
  { key: "price_full_day", label: "יום מלא" },
  { key: "price_shabbat", label: "שבת" },
];

const HOURS_PAIRS: { start: keyof VenueRow; end: keyof VenueRow; label: string }[] = [
  { start: "hours_morning_start", end: "hours_morning_end", label: "בוקר" },
  { start: "hours_evening_start", end: "hours_evening_end", label: "ערב" },
  { start: "hours_full_start", end: "hours_full_end", label: "יום מלא" },
  { start: "hours_shabbat_start", end: "hours_shabbat_end", label: "שבת" },
];

interface Step4Props {
  venue: VenueWithImages;
  eventType: EventType;
  onBook: () => void;
  onBack: () => void;
}

export function Step4VenueDetail({ venue, eventType, onBook, onBack }: Step4Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = venue.images;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-5">
      {/* Image gallery */}
      {images.length > 0 ? (
        <div className="relative rounded-xl overflow-hidden h-52 bg-muted">
          <img
            src={getImageUrl(images[imgIdx].storage_path)}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="h-40 bg-muted rounded-xl flex items-center justify-center">
          <Building2 size={40} className="text-muted-foreground" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{venue.name}</h2>
          <p className="text-sm text-muted-foreground">
            {venue.address} · {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
          </p>
        </div>
        <Badge variant="outline">{venue.max_capacity} אורחים</Badge>
      </div>

      {venue.description_short && (
        <p className="text-sm text-muted-foreground">{venue.description_short}</p>
      )}

      <Separator />

      {/* Pricing */}
      <div>
        <h3 className="font-semibold mb-2">מחירון</h3>
        <div className="grid grid-cols-2 gap-2">
          {PRICE_KEYS.map(({ key, label }) => {
            const val = venue[key];
            if (!val) return null;
            return (
              <div key={key} className={`flex justify-between text-sm px-3 py-2 rounded-md ${
                label === EVENT_TYPE_LABELS[eventType] ? "bg-primary/10 font-medium" : "bg-muted"
              }`}>
                <span>{label}</span>
                <span>{formatCurrency(Number(val))}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hours */}
      <div>
        <h3 className="font-semibold mb-2">שעות</h3>
        <div className="space-y-1">
          {HOURS_PAIRS.map(({ start, end, label }) => {
            const s = venue[start], e = venue[end];
            if (!s || !e) return null;
            return (
              <div key={start} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span dir="ltr">{String(s).slice(0, 5)} - {String(e).slice(0, 5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Access */}
      {(venue.parking_info || venue.public_transport_info) && (
        <>
          <Separator />
          {venue.parking_info && (
            <div>
              <h3 className="font-semibold mb-1">חנייה</h3>
              <p className="text-sm text-muted-foreground">{venue.parking_info}</p>
            </div>
          )}
          {venue.public_transport_info && (
            <div>
              <h3 className="font-semibold mb-1">תחבורה ציבורית</h3>
              <p className="text-sm text-muted-foreground">{venue.public_transport_info}</p>
            </div>
          )}
        </>
      )}

      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1 flex gap-3">
        <Button onClick={onBook} className="flex-1">קבע אירוע באולם זה</Button>
        <Button variant="outline" onClick={onBack}>חזור לרשימה</Button>
      </div>
    </div>
  );
}
