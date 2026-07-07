/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Image from "next/image";
import {
  MapPin,
  Users,
  Clock,
  Car,
  Bus,
  Tag,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  ZoomIn,
  ZoomOut,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { VenueRow, VenueImageRow, UserRole } from "@/types/database";
import { EventFormModal } from "@/components/calendar/EventFormModal";

const BUCKET = "venue-images";

interface VenueDetailModalProps {
  venue: VenueRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  role?: UserRole;
}

function ImageCarousel({ venueId }: { venueId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [images, setImages] = useState<VenueImageRow[]>([]);
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    (supabase.from("venue_images") as any)
      .select("*")
      .eq("venue_id", venueId)
      .order("is_primary", { ascending: false })
      .order("created_at")
      .then(({ data }: { data: VenueImageRow[] | null }) => {
        setImages(data ?? []);
        setCurrent(0);
      });
  }, [venueId, supabase]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const count = images.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxOpen(false); setZoom(1); }
      if (e.key === "ArrowLeft")  { setCurrent(c => (c - 1 + count) % count); setZoom(1); }
      if (e.key === "ArrowRight") { setCurrent(c => (c + 1) % count); setZoom(1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, images.length]);

  if (!images.length) return null;

  const getUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <>
      <div className="space-y-2">
        <div
          className="relative rounded-xl overflow-hidden bg-muted cursor-zoom-in"
          style={{ aspectRatio: "16/7" }}
          onClick={() => { setLightboxOpen(true); setZoom(1); }}
        >
          <Image
            src={getUrl(images[current].storage_path)}
            alt="venue"
            fill
            className="object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2.5 py-0.5 rounded-full">
                {current + 1} / {images.length}
              </span>
            </>
          )}
          {images[current].is_primary && (
            <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              ראשי
            </span>
          )}
          {/* Zoom hint */}
          <span className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-70">
            <ZoomIn className="h-3.5 w-3.5" />
          </span>
        </div>

        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={`relative flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                  i === current
                    ? "border-primary opacity-100"
                    : "border-transparent opacity-60 hover:opacity-90"
                }`}
              >
                <Image
                  src={getUrl(img.storage_path)}
                  alt=""
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox - nested Radix Dialog avoids parent dialog's onInteractOutside interference */}
      <DialogPrimitive.Root
        open={lightboxOpen}
        onOpenChange={(open) => { setLightboxOpen(open); if (!open) setZoom(1); }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9999] bg-black/90" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-[9999] flex items-center justify-center outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft")  { prev(); setZoom(1); }
              if (e.key === "ArrowRight") { next(); setZoom(1); }
            }}
          >
            <DialogPrimitive.Title className="sr-only">תצוגת תמונה</DialogPrimitive.Title>
            {/* Close */}
            <DialogPrimitive.Close asChild>
              <button className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10">
                <X size={20} />
              </button>
            </DialogPrimitive.Close>

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <button
                className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
                onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              >
                <ZoomIn size={20} />
              </button>
              <button
                className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
                onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}
              >
                <ZoomOut size={20} />
              </button>
            </div>

            {/* Prev */}
            {images.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { prev(); setZoom(1); }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image */}
            <div
              style={{ transform: `scale(${zoom})`, transition: "transform 0.2s", cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
              onClick={() => setZoom(z => z > 1 ? 1 : 2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getUrl(images[current].storage_path)}
                alt="תמונה מוגדלת"
                className="max-h-[85vh] max-w-[85vw] object-contain select-none"
              />
            </div>

            {/* Next */}
            {images.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { next(); setZoom(1); }}
              >
                <ChevronRight size={24} />
              </button>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {current + 1} / {images.length}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-1.5 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function PriceCard({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  if (!value) return null;
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function HoursRow({
  label,
  start,
  end,
}: {
  label: string;
  start?: string | null;
  end?: string | null;
}) {
  if (!start && !end) return null;
  return (
    <div className="flex justify-between items-center py-2.5 px-3 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        dir="ltr"
        className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md"
      >
        {start ?? "-"} – {end ?? "-"}
      </span>
    </div>
  );
}

export function VenueDetailModal({
  venue,
  open,
  onOpenChange,
  userId,
  role,
}: VenueDetailModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const hasPrices =
    venue.price_morning ||
    venue.price_evening ||
    venue.price_full_day ||
    venue.price_shabbat;
  const hasHours =
    venue.hours_morning_start ||
    venue.hours_evening_start ||
    venue.hours_full_start ||
    venue.hours_shabbat_start;
  const hasAccess = venue.parking_info || venue.public_transport_info;
  const isAdmin = role === "admin";
  const canCreateEvent = userId && role;

  const handleEventFormClose = () => {
    setShowEventForm(false);
    setDatePickerOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle>{venue.name}</DialogTitle>
                <Badge
                  variant={venue.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {venue.is_active ? "פעיל" : "לא פעיל"}
                </Badge>
                <Badge
                  variant={
                    venue.approval_status === "approved"
                      ? "default"
                      : venue.approval_status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {venue.approval_status === "approved" && "אושר"}
                  {venue.approval_status === "pending" && "בהמתנה"}
                  {venue.approval_status === "rejected" && "דחוי"}
                </Badge>
              </div>
              {canCreateEvent && (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="default" className="gap-1.5">
                      <CalendarIcon className="h-4 w-4" />
                      אירוע חדש
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[620px] max-w-[95vw] overflow-x-auto p-3" align="end">
                    <HebrewCalendar
                      compact
                      selected={selectedDate}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          setSelectedDate(date);
                          setDatePickerOpen(false);
                          setShowEventForm(true);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </DialogHeader>

        <DialogBody>
          <div className="space-y-6 pt-1">
            {/* Images */}
            <ImageCarousel venueId={venue.id} />

            {/* Location */}
            <section>
              <SectionTitle icon={MapPin} title="מיקום" />
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <p className="text-sm font-medium">{venue.address}</p>
                <p className="text-sm text-muted-foreground">
                  {venue.city}
                  {venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                </p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{venue.max_capacity} אורחים</span>
                </div>
              </div>
            </section>

            {/* Amenities */}
            {(venue.has_elevator || venue.has_parking || venue.is_accessible || venue.has_public_transport) && (
              <section>
                <h3 className="text-sm font-semibold mb-3">גישה</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.has_elevator && <Badge variant="outline">🛗 מעלית</Badge>}
                  {venue.has_parking && <Badge variant="outline">🅿️ חניה</Badge>}
                  {venue.is_accessible && <Badge variant="outline">♿ נגיש לנכים</Badge>}
                  {venue.has_public_transport && <Badge variant="outline">🚌 תחבורה ציבורית</Badge>}
                </div>
              </section>
            )}

            {/* Description */}
            {(venue.description_short || venue.description_long) && (
              <section>
                <SectionTitle icon={FileText} title="תיאור" />
                {venue.description_short && (
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                    {venue.description_short}
                  </p>
                )}
                {venue.description_long && (
                  <p className="text-sm leading-relaxed">
                    {venue.description_long}
                  </p>
                )}
              </section>
            )}

            {/* Rejection Reason */}
            {venue.approval_status === "rejected" && venue.rejection_reason && (
              <section className="bg-red-50 rounded-lg p-3 border border-red-200">
                <h3 className="text-sm font-semibold text-red-900 mb-2">סיבת דחייה</h3>
                <p className="text-sm text-red-800">{venue.rejection_reason}</p>
              </section>
            )}

            {/* Prices */}
            {hasPrices && (
              <section>
                <SectionTitle icon={Tag} title="מחירון" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <PriceCard label="בוקר" value={venue.price_morning} />
                  <PriceCard label="ערב" value={venue.price_evening} />
                  <PriceCard label="יום מלא" value={venue.price_full_day} />
                  <PriceCard label="שבת" value={venue.price_shabbat} />
                </div>
              </section>
            )}

            {/* Hours */}
            {hasHours && (
              <section>
                <SectionTitle icon={Clock} title="שעות" />
                <div className="rounded-lg border overflow-hidden">
                  <HoursRow
                    label="בוקר"
                    start={venue.hours_morning_start}
                    end={venue.hours_morning_end}
                  />
                  <HoursRow
                    label="ערב"
                    start={venue.hours_evening_start}
                    end={venue.hours_evening_end}
                  />
                  <HoursRow
                    label="יום מלא"
                    start={venue.hours_full_start}
                    end={venue.hours_full_end}
                  />
                  <HoursRow
                    label="שבת"
                    start={venue.hours_shabbat_start}
                    end={venue.hours_shabbat_end}
                  />
                </div>
              </section>
            )}

            {/* Access */}
            {hasAccess && (
              <section>
                <SectionTitle icon={Car} title="גישה" />
                <div className="space-y-3">
                  {venue.parking_info && (
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">
                          חנייה
                        </p>
                        <p className="text-sm">{venue.parking_info}</p>
                      </div>
                    </div>
                  )}
                  {venue.public_transport_info && (
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <Bus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">
                          תחבורה ציבורית
                        </p>
                        <p className="text-sm">{venue.public_transport_info}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>

    {canCreateEvent && (
      <EventFormModal
        open={showEventForm}
        onClose={handleEventFormClose}
        date={selectedDate}
        venueId={venue.id}
        userId={userId}
        isAdmin={isAdmin}
      />
    )}
    </>
  );
}
