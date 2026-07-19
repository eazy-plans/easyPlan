"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import Image from "next/image";
import { X, Star, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import type { VenueRow, UserRow, VenueImageRow, VenueApprovalStatus } from "@/types/database";
import {
  uploadVenueImage,
  deleteVenueImage,
  updateVenueImagePrimary,
} from "@/app/actions/venue-images";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface VenueFormProps {
  venue?: VenueRow;
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  onSuccess?: (venueId?: string) => void;
  isAdmin?: boolean;
  initialImages?: VenueImageRow[];
}

export function VenueForm({ venue, owners, onSuccess, isAdmin = false, initialImages }: VenueFormProps) {
  const router = useRouter();
  const isEdit = !!venue;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: venue?.name ?? "",
    address: venue?.address ?? "",
    city: venue?.city ?? "",
    neighborhood: venue?.neighborhood ?? "",
    max_capacity: venue?.max_capacity?.toString() ?? "",
    owner_user_id: venue?.owner_user_id ?? "",
    contact_name: venue?.contact_name ?? "",
    contact_phone: venue?.contact_phone ?? "",
    description_short: venue?.description_short ?? "",
    description_long: venue?.description_long ?? "",
    parking_info: venue?.parking_info ?? "",
    public_transport_info: venue?.public_transport_info ?? "",
    has_elevator: typeof venue?.has_elevator === "string" ? venue.has_elevator === "true" : (venue?.has_elevator ?? false),
    has_parking: typeof venue?.has_parking === "string" ? venue.has_parking === "true" : (venue?.has_parking ?? false),
    is_accessible: typeof venue?.is_accessible === "string" ? venue.is_accessible === "true" : (venue?.is_accessible ?? false),
    has_public_transport: typeof venue?.has_public_transport === "string" ? venue.has_public_transport === "true" : (venue?.has_public_transport ?? false),
    price_morning: venue?.price_morning?.toString() ?? "",
    price_evening: venue?.price_evening?.toString() ?? "",
    price_full_day: venue?.price_full_day?.toString() ?? "",
    price_shabbat: venue?.price_shabbat?.toString() ?? "",
    hours_morning_start: venue?.hours_morning_start ?? "",
    hours_morning_end: venue?.hours_morning_end ?? "",
    hours_evening_start: venue?.hours_evening_start ?? "18:00",
    hours_evening_end: venue?.hours_evening_end ?? "00:00",
    hours_full_start: venue?.hours_full_start ?? "",
    hours_full_end: venue?.hours_full_end ?? "",
    hours_shabbat_start: venue?.hours_shabbat_start ?? "",
    hours_shabbat_end: venue?.hours_shabbat_end ?? "",
    is_active: venue?.is_active ?? true,
    cancellation_policy: venue?.cancellation_policy ?? "",
    approval_status: (venue?.approval_status ?? "pending") as VenueApprovalStatus,
    rejection_reason: venue?.rejection_reason ?? null,
  });

  // Image state
  const [existingImages, setExistingImages] = useState<VenueImageRow[]>(initialImages ?? []);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && venue?.id && !initialImages) {
      loadImages(venue.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, venue?.id]);

  // Revoke object URLs when component unmounts
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadImages(venueId: string) {
    const { data } = await supabase.from("venue_images")
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at");
    setExistingImages(data ?? []);
  }

  function getUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPendingFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    e.target.value = "";
  }

  function removePending(id: string) {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function markDeleted(imgId: string) {
    setDeletedIds((prev) => new Set([...prev, imgId]));
  }

  function setPrimaryExisting(imgId: string) {
    setExistingImages((prev) =>
      prev.map((img) => ({ ...img, is_primary: img.id === imgId }))
    );
  }

  async function processImages(venueId: string) {
    const surviving = existingImages.filter((i) => !deletedIds.has(i.id));
    const primaryDeleted = existingImages.some(
      (i) => i.is_primary && deletedIds.has(i.id)
    );

    // Delete removed images in parallel
    await Promise.all(
      [...deletedIds].map(async (imgId) => {
        const img = existingImages.find((i) => i.id === imgId);
        if (!img) return;
        await deleteVenueImage(img.id, img.is_primary, venueId);
      })
    );

    // Sync primary flag changes (user toggled primary without deleting)
    const primaryChanged = surviving.find((i) => i.is_primary);
    if (primaryChanged && !primaryDeleted) {
      await updateVenueImagePrimary(venueId, primaryChanged.id);
    }

    // Upload pending files in parallel
    const hasPrimary = surviving.some((i) => i.is_primary) && !primaryDeleted;
    await Promise.all(
      pendingFiles.map(async (pending, index) => {
        const fd = new FormData();
        fd.append("file", pending.file);
        fd.append("venueId", venueId);
        fd.append("isPrimary", String(!hasPrimary && index === 0));
        try {
          await uploadVenueImage(fd);
        } catch (err: unknown) {
          toast.error("שגיאה בהעלאת תמונה: " + (err instanceof Error ? err.message : String(err)));
        }
      })
    );
  }

  function set(field: string, value: string | boolean | number | null) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "שם האולם הוא שדה חובה";
    else if (form.name.trim().length < 2) errs.name = "שם האולם חייב להכיל לפחות 2 תווים";

    if (!form.address.trim()) errs.address = "כתובת היא שדה חובה";

    if (!form.city.trim()) errs.city = "עיר היא שדה חובה";

    if (!form.max_capacity) errs.max_capacity = "קיבולת מקסימלית היא שדה חובה";
    else if (isNaN(parseInt(form.max_capacity)) || parseInt(form.max_capacity) < 1)
      errs.max_capacity = "קיבולת חייבת להיות מספר חיובי";

    if (isAdmin && !form.owner_user_id) errs.owner_user_id = "יש לבחור בעל אולם";

    if (form.contact_phone.trim() && !/^[\d+\-() ]{7,15}$/.test(form.contact_phone.trim()))
      errs.contact_phone = "מספר טלפון לא תקין";

    for (const key of ["price_morning", "price_evening", "price_full_day", "price_shabbat"]) {
      const val = form[key as keyof typeof form] as string;
      if (val !== "" && (isNaN(parseFloat(val)) || parseFloat(val) < 0))
        errs[key] = "המחיר חייב להיות מספר אי-שלילי";
    }

    const hourPairs = [
      ["hours_morning_start", "hours_morning_end"],
      ["hours_evening_start", "hours_evening_end"],
      ["hours_full_start", "hours_full_end"],
      ["hours_shabbat_start", "hours_shabbat_end"],
    ];
    for (const [startKey, endKey] of hourPairs) {
      const s = form[startKey as keyof typeof form] as string;
      const e = form[endKey as keyof typeof form] as string;
      if (s && !e) errs[endKey] = "יש למלא שעת סיום";
      if (!s && e) errs[startKey] = "יש למלא שעת התחלה";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      neighborhood: form.neighborhood || null,
      max_capacity: parseInt(form.max_capacity),
      owner_user_id: form.owner_user_id,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      description_short: form.description_short || null,
      description_long: form.description_long || null,
      parking_info: form.parking_info || null,
      public_transport_info: form.public_transport_info || null,
      has_elevator: form.has_elevator,
      has_parking: form.has_parking,
      is_accessible: form.is_accessible,
      has_public_transport: form.has_public_transport,
      price_morning: form.price_morning ? parseFloat(form.price_morning) : null,
      price_evening: form.price_evening ? parseFloat(form.price_evening) : null,
      price_full_day: form.price_full_day ? parseFloat(form.price_full_day) : null,
      price_shabbat: form.price_shabbat ? parseFloat(form.price_shabbat) : null,
      hours_morning_start: form.hours_morning_start || null,
      hours_morning_end: form.hours_morning_end || null,
      hours_evening_start: form.hours_evening_start || null,
      hours_evening_end: form.hours_evening_end || null,
      hours_full_start: form.hours_full_start || null,
      hours_full_end: form.hours_full_end || null,
      hours_shabbat_start: form.hours_shabbat_start || null,
      hours_shabbat_end: form.hours_shabbat_end || null,
      is_active: form.is_active,
      cancellation_policy: form.cancellation_policy.trim() || null,
      approval_status: form.approval_status,
      rejection_reason: form.rejection_reason,
    };

    let error;
    let venueId: string;

    if (isEdit) {
      // A changed address invalidates the stored coordinates - clear them so
      // the map re-geocodes (and re-persists) on its next view.
      const addressChanged = venue.address !== form.address || venue.city !== form.city;
      const updatePayload = addressChanged
        ? { ...payload, lat: null, lng: null, coords_approximate: false }
        : payload;
      ({ error } = await supabase.from("venues").update(updatePayload).eq("id", venue.id));
      venueId = venue.id;
    } else {
      const { data: inserted, error: insertError } = await supabase.from("venues")
        .insert(payload)
        .select("id")
        .single();
      if (insertError || !inserted) {
        setLoading(false);
        toast.error("שגיאה בשמירת האולם: " + (insertError?.message ?? ""));
        return;
      }
      venueId = inserted.id;
    }

    if (error) {
      setLoading(false);
      toast.error("שגיאה בשמירת האולם: " + error.message);
      return;
    }

    await processImages(venueId);

    setLoading(false);
    toast.success(isEdit ? "האולם עודכן בהצלחה" : "האולם נוסף בהצלחה");

    if (onSuccess) {
      onSuccess();
      router.refresh();
    } else {
      router.push("/venues");
      router.refresh();
    }
  }

  const visibleExisting = existingImages.filter((i) => !deletedIds.has(i.id));

  const allLightboxUrls = [
    ...visibleExisting.map(img => getUrl(img.storage_path)),
    ...pendingFiles.map(p => p.previewUrl),
  ];

  function closeLightbox() { setLightboxIdx(null); setZoom(1); }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lightboxIdx === null) return;
    const count = allLightboxUrls.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxIdx(null); setZoom(1); }
      if (e.key === "ArrowLeft")  { setLightboxIdx(i => i !== null ? (i - 1 + count) % count : null); setZoom(1); }
      if (e.key === "ArrowRight") { setLightboxIdx(i => i !== null ? (i + 1) % count : null); setZoom(1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, allLightboxUrls.length]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">פרטים כלליים</h2>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="name">שם האולם *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">מיקום</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="address">כתובת *</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} className={errors.address ? "border-destructive" : ""} />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">עיר *</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} className={errors.city ? "border-destructive" : ""} />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="neighborhood">שכונה</Label>
              <Input id="neighborhood" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="max_capacity">קיבולת מקסימלית *</Label>
            <Input id="max_capacity" type="number" min="1" value={form.max_capacity} onChange={(e) => set("max_capacity", e.target.value)} className={errors.max_capacity ? "border-destructive" : ""} />
            {errors.max_capacity && <p className="text-xs text-destructive">{errors.max_capacity}</p>}
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <Label>בעל האולם *</Label>
              <Combobox
                options={owners.map((o) => ({ value: o.id, label: `${o.full_name} (${o.email})` }))}
                value={form.owner_user_id}
                onValueChange={(v) => set("owner_user_id", v)}
                placeholder="בחר בעל אולם"
                searchPlaceholder="הקלד שם או מייל..."
                clearable={false}
                className={errors.owner_user_id ? "border-destructive" : ""}
              />
              {errors.owner_user_id && <p className="text-xs text-destructive">{errors.owner_user_id}</p>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">איש קשר</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="contact_name">איש קשר</Label>
              <Input id="contact_name" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_phone">טלפון</Label>
              <Input id="contact_phone" type="tel" dir="ltr" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className={errors.contact_phone ? "border-destructive" : ""} />
              {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">תיאור</h3>
          <div className="space-y-1">
            <Label htmlFor="description_short">תיאור קצר</Label>
            <Input id="description_short" value={form.description_short} onChange={(e) => set("description_short", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description_long">תיאור מפורט</Label>
            <Textarea id="description_long" rows={4} value={form.description_long} onChange={(e) => set("description_long", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">מחירון (₪)</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "price_morning", label: "בוקר" },
            { key: "price_evening", label: "ערב" },
            { key: "price_full_day", label: "יום מלא" },
            { key: "price_shabbat", label: "שבת" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={form[key as keyof typeof form] as string}
                onChange={(e) => set(key, e.target.value)}
                className={errors[key] ? "border-destructive" : ""}
              />
              {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Hours */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">שעות</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { startKey: "hours_morning_start", endKey: "hours_morning_end", label: "בוקר" },
            { startKey: "hours_evening_start", endKey: "hours_evening_end", label: "ערב" },
            { startKey: "hours_full_start", endKey: "hours_full_end", label: "יום מלא" },
            { startKey: "hours_shabbat_start", endKey: "hours_shabbat_end", label: "שבת" },
          ].map(({ startKey, endKey, label }) => (
            <div key={startKey} className="space-y-1">
              <Label>{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={form[startKey as keyof typeof form] as string}
                  onChange={(e) => set(startKey, e.target.value)}
                  className={`w-full${errors[startKey] ? " border-destructive" : ""}`}
                  dir="ltr"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={form[endKey as keyof typeof form] as string}
                  onChange={(e) => set(endKey, e.target.value)}
                  className={`w-full${errors[endKey] ? " border-destructive" : ""}`}
                  dir="ltr"
                />
              </div>
              {errors[startKey] && <p className="text-xs text-destructive">{errors[startKey]}</p>}
              {errors[endKey] && <p className="text-xs text-destructive">{errors[endKey]}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Amenities & Access */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">גישה</h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_elevator}
              onChange={(e) => set("has_elevator", e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm">מעלית</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_accessible}
              onChange={(e) => set("is_accessible", e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm">נגיש לנכים</span>
          </label>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_parking}
                onChange={(e) => set("has_parking", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium">חנייה</span>
            </label>
            <Textarea
              id="parking_info"
              placeholder="תיאור פרטי החנייה (כמות מקומות, סוג, מחיר וכו')"
              rows={2}
              value={form.parking_info}
              onChange={(e) => set("parking_info", e.target.value)}
              className="ml-8"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_public_transport}
                onChange={(e) => set("has_public_transport", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium">תחבורה ציבורית</span>
            </label>
            <Textarea
              id="public_transport_info"
              placeholder="תיאור האפשרויות של תחבורה ציבורית (תחנת אוטובוס, רכבת וכו')"
              rows={2}
              value={form.public_transport_info}
              onChange={(e) => set("public_transport_info", e.target.value)}
              className="ml-8"
            />
          </div>
        </div>
      </section>

      {/* Cancellation Policy */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">מדיניות ביטול</h2>
        <div className="space-y-1">
          <Label htmlFor="cancellation_policy">תנאי הביטול של האולם</Label>
          <Textarea
            id="cancellation_policy"
            placeholder="תאר את תנאי הביטול וההחזר של האולם (לדוגמה: החזר מלא בביטול עד 14 ימים לפני האירוע)"
            rows={4}
            value={form.cancellation_policy}
            onChange={(e) => set("cancellation_policy", e.target.value)}
          />
          <p className="text-xs text-gray-500">
            הטקסט יוצג ללקוח בעת ההזמנה ובעת ביטול הזמנה.
          </p>
        </div>
      </section>

      {/* Admin Approval */}
      {isAdmin && isEdit && (
        <section className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold border-b pb-2">אישור מנהל</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="approval_status">סטטוס אישור</Label>
              <Combobox
                options={[
                  { value: "pending", label: "בהמתנה" },
                  { value: "approved", label: "אושר" },
                  { value: "rejected", label: "דחוי" },
                ]}
                value={form.approval_status}
                onValueChange={(v) => set("approval_status", v as VenueApprovalStatus)}
                placeholder="סטטוס אישור"
                clearable={false}
              />
            </div>
            {form.approval_status === "rejected" && (
              <div className="space-y-1">
                <Label htmlFor="rejection_reason">סיבת דחייה</Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="הסבר מדוע דחה הנכס"
                  rows={3}
                  value={form.rejection_reason ?? ""}
                  onChange={(e) => set("rejection_reason", e.target.value)}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Show Approval Status Badge */}
      {isEdit && (
        <div className="bg-gray-50 p-3 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">סטטוס אישור:</p>
          <div className="flex items-center gap-2">
            {form.approval_status === "pending" && (
              <><span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span><span className="text-sm font-medium">בהמתנה</span></>
            )}
            {form.approval_status === "approved" && (
              <><span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span><span className="text-sm font-medium">אושר</span></>
            )}
            {form.approval_status === "rejected" && (
              <><span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span><span className="text-sm font-medium">דחוי</span></>
            )}
          </div>
        </div>
      )}

      {/* Images */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">תמונות</h2>

        {visibleExisting.length === 0 && pendingFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">לא נבחרו תמונות</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Existing saved images */}
            {visibleExisting.map((img, idx) => (
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
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPrimaryExisting(img.id); }}
                      className="w-full flex items-center justify-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded px-2 py-1"
                    >
                      <Star size={12} />
                      הגדר כראשי
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); markDeleted(img.id); }}
                    className="w-full flex items-center justify-center gap-1 text-xs bg-red-500/80 hover:bg-red-600 text-white rounded px-2 py-1"
                  >
                    <X size={12} />
                    מחק
                  </button>
                </div>
              </div>
            ))}

            {/* Pending (not yet uploaded) files */}
            {pendingFiles.map((p, idx) => (
              <div
                key={p.id}
                className="relative group rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-muted cursor-pointer"
                onClick={() => { setLightboxIdx(visibleExisting.length + idx); setZoom(1); }}
              >
                <div className="aspect-video relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute top-1 right-1 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-sm">
                  ממתין
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePending(p.id); }}
                  className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
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
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            הוסף תמונות
          </Button>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "עדכן אולם" : "הוסף אולם"}
        </Button>
        {!isEdit && (
          <Button type="button" variant="outline" onClick={() => onSuccess ? onSuccess() : router.back()}>
            ביטול
          </Button>
        )}
      </div>

      {/* Lightbox - nested Radix Dialog avoids parent dialog's onInteractOutside interference */}
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
              if (e.key === "ArrowLeft")  { setLightboxIdx(i => i !== null ? (i - 1 + allLightboxUrls.length) % allLightboxUrls.length : null); setZoom(1); }
              if (e.key === "ArrowRight") { setLightboxIdx(i => i !== null ? (i + 1) % allLightboxUrls.length : null); setZoom(1); }
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

            {allLightboxUrls.length > 1 && (
              <button type="button" className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { setLightboxIdx(i => i !== null ? (i - 1 + allLightboxUrls.length) % allLightboxUrls.length : null); setZoom(1); }}>
                <ChevronLeft size={24} />
              </button>
            )}

            {lightboxIdx !== null && (
              <div
                style={{ transform: `scale(${zoom})`, transition: "transform 0.2s", cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
                onClick={() => setZoom(z => z > 1 ? 1 : 2)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={allLightboxUrls[lightboxIdx]} alt="תמונה מוגדלת" className="max-h-[85vh] max-w-[85vw] object-contain select-none" />
              </div>
            )}

            {allLightboxUrls.length > 1 && (
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                onClick={() => { setLightboxIdx(i => i !== null ? (i + 1) % allLightboxUrls.length : null); setZoom(1); }}>
                <ChevronRight size={24} />
              </button>
            )}

            {allLightboxUrls.length > 1 && lightboxIdx !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {lightboxIdx + 1} / {allLightboxUrls.length}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </form>
  );
}
