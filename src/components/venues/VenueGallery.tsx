/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import type { VenueImageRow } from "@/types/database";

const BUCKET = "venue-images";

interface VenueGalleryProps {
  venueId: string;
  initialImages?: VenueImageRow[];
}

export function VenueGallery({ venueId, initialImages }: VenueGalleryProps) {
  const [images, setImages] = useState<VenueImageRow[]>(initialImages ?? []);
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  async function load() {

    const { data } = await (supabase.from("venue_images") as any)
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at");
    setImages(data ?? []);
  }

  useEffect(() => {
    if (!initialImages) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  function getUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    const isPrimaryFirst = images.length === 0;

    await Promise.all(
      files.map(async (file, index) => {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${venueId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
        if (uploadError) { toast.error("שגיאה בהעלאת תמונה: " + uploadError.message); return; }

        const { error: dbError } = await (supabase.from("venue_images") as any).insert({
          venue_id: venueId,
          storage_path: path,
          is_primary: isPrimaryFirst && index === 0,
        });
        if (dbError) toast.error("שגיאה בשמירת התמונה: " + dbError.message);
      })
    );

    setUploading(false);
    e.target.value = "";
    toast.success("התמונות הועלו בהצלחה");
    await load();
  }

  async function handleDelete(img: VenueImageRow) {
    await supabase.storage.from(BUCKET).remove([img.storage_path]);

    await (supabase.from("venue_images") as any).delete().eq("id", img.id);

    // If we deleted the primary, promote the first remaining image
    if (img.is_primary) {
      const remaining = images.filter((i) => i.id !== img.id);
      if (remaining.length > 0) {
    
        await (supabase.from("venue_images") as any)
          .update({ is_primary: true })
          .eq("id", remaining[0].id);
      }
    }

    toast.success("התמונה נמחקה");
    await load();
  }

  async function handleSetPrimary(img: VenueImageRow) {

    await (supabase.from("venue_images") as any)
      .update({ is_primary: false })
      .eq("venue_id", venueId);

    await (supabase.from("venue_images") as any)
      .update({ is_primary: true })
      .eq("id", img.id);
    await load();
  }

  function closeLightbox() { setLightboxIdx(null); setZoom(1); }

  useEffect(() => {
    if (lightboxIdx === null) return;
    const count = images.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxIdx(null); setZoom(1); }
      if (e.key === "ArrowLeft")  { setLightboxIdx(i => i !== null ? (i - 1 + count) % count : null); setZoom(1); }
      if (e.key === "ArrowRight") { setLightboxIdx(i => i !== null ? (i + 1) % count : null); setZoom(1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, images.length]);

  return (
    <section className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold border-b pb-2">גלריית תמונות</h2>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין תמונות עדיין</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden border bg-muted cursor-pointer"
              onClick={() => { setLightboxIdx(idx); setZoom(1); }}
            >
              <div className="aspect-video relative">
                <Image
                  src={getUrl(img.storage_path)}
                  alt="venue"
                  fill
                  className="object-cover"

                />
              </div>

              {img.is_primary && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-sm">
                  ראשי
                </span>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {!img.is_primary && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full text-xs"
                    onClick={(e) => { e.stopPropagation(); handleSetPrimary(img); }}
                  >
                    הגדר כראשי
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full text-xs"
                  onClick={(e) => { e.stopPropagation(); handleDelete(img); }}
                >
                  מחק
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "מעלה תמונות..." : "הוסף תמונות"}
        </Button>
      </div>

      {/* Lightbox — nested Radix Dialog avoids onInteractOutside interference */}
      <DialogPrimitive.Root
        open={lightboxIdx !== null}
        onOpenChange={(open) => { if (!open) closeLightbox(); }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9999] bg-black/90" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-[9999] flex items-center justify-center outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft")  { setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : null); setZoom(1); }
              if (e.key === "ArrowRight") { setLightboxIdx(i => i !== null ? (i + 1) % images.length : null); setZoom(1); }
            }}
          >
            <DialogPrimitive.Title className="sr-only">תצוגת תמונה</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button type="button" className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10">
                <X size={20} />
              </button>
            </DialogPrimitive.Close>

            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <button type="button" className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
                onClick={() => setZoom(z => Math.min(z + 0.5, 4))}>
                <ZoomIn size={20} />
              </button>
              <button type="button" className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
                onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}>
                <ZoomOut size={20} />
              </button>
            </div>

            {images.length > 1 && (
              <button type="button" className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : null); setZoom(1); }}>
                <ChevronLeft size={24} />
              </button>
            )}

            {lightboxIdx !== null && (
              <div
                style={{ transform: `scale(${zoom})`, transition: "transform 0.2s", cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
                onClick={() => setZoom(z => z > 1 ? 1 : 2)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getUrl(images[lightboxIdx].storage_path)} alt="תמונה מוגדלת" className="max-h-[85vh] max-w-[85vw] object-contain select-none" />
              </div>
            )}

            {images.length > 1 && (
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { setLightboxIdx(i => i !== null ? (i + 1) % images.length : null); setZoom(1); }}>
                <ChevronRight size={24} />
              </button>
            )}

            {images.length > 1 && lightboxIdx !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {lightboxIdx + 1} / {images.length}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </section>
  );
}
