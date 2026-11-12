"use server";

import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const BUCKET = "venue-images";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const REJECTED_FILE_MESSAGE =
  "הקובץ שנבחר אינו תמונה תקינה. ניתן להעלות קבצי JPEG, PNG או WEBP בלבד, עד 5MB";

/**
 * Ensures the caller is signed in and may manage images for `venueId`
 * (admins, or the owner of that venue). Throws otherwise. Server actions are
 * public HTTP endpoints, so this check is the only thing standing between the
 * service-role key and an anonymous caller - never remove it.
 */
async function getVenueName(supabase: ReturnType<typeof createAdminClient>, venueId: string): Promise<string> {
  const { data } = await supabase.from("venues").select("name").eq("id", venueId).maybeSingle();
  return data?.name ?? venueId;
}

// Returns the caller's own session-bound client (not just their id) so audit
// log calls downstream can run as that user - log_audit_event() (038) reads
// the actor from auth.uid(), which only resolves on this client, not on the
// service-role client used for the storage/DB writes below.
async function authorizeVenueAccess(venueId: string): Promise<Awaited<ReturnType<typeof createServerClient>>> {
  if (!venueId) throw new Error("חסר מזהה אולם");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("אין הרשאה");

  const { data: profile } = await supabase.from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return supabase;

  const { data: venue } = await supabase.from("venues")
    .select("owner_user_id")
    .eq("id", venueId)
    .single();

  if (!venue || venue.owner_user_id !== user.id) throw new Error("אין הרשאה לבצע פעולה זו");
  return supabase;
}

export async function uploadVenueImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  const venueId = formData.get("venueId") as string;
  const isPrimary = formData.get("isPrimary") === "true";

  const sessionClient = await authorizeVenueAccess(venueId);

  if (!(file instanceof File)) throw new Error("לא נבחר קובץ");
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error("הקובץ גדול מדי (מקסימום 5MB)");

  // Never trust the extension or the browser-supplied content type: decode
  // the actual bytes and re-encode to one fixed format. This is what rejects
  // disguised/mislabeled files (e.g. an .svg or .html renamed to .jpg), and
  // re-encoding drops all EXIF/GPS metadata from the original.
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let outputBuffer: Buffer;
  try {
    const detected = await sharp(inputBuffer).metadata();
    if (!detected.format || !ALLOWED_FORMATS.has(detected.format)) {
      throw new Error(REJECTED_FILE_MESSAGE);
    }
    outputBuffer = await sharp(inputBuffer).rotate().webp({ quality: 82 }).toBuffer();
  } catch {
    throw new Error(REJECTED_FILE_MESSAGE);
  }

  const path = `${venueId}/${crypto.randomUUID()}.webp`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, outputBuffer, { contentType: "image/webp" });

  if (uploadError) {
    console.error("uploadVenueImage: storage upload failed:", uploadError);
    throw new Error("העלאת התמונה נכשלה, נסו שוב");
  }

  const { error: dbError } = await supabase.from("venue_images").insert({
    venue_id: venueId,
    storage_path: path,
    is_primary: isPrimary,
  });

  if (dbError) {
    console.error("uploadVenueImage: insert failed:", dbError);
    throw new Error("העלאת התמונה נכשלה, נסו שוב");
  }

  logAudit(sessionClient, "venue.image_upload", "venue", venueId, { venue: await getVenueName(supabase, venueId), path });

  return path;
}

export async function deleteVenueImage(
  imageId: string,
  wasprimary: boolean,
  venueId: string
): Promise<void> {
  const sessionClient = await authorizeVenueAccess(venueId);

  const supabase = createAdminClient();

  // Confirm the image actually belongs to this venue before touching storage.
  const { data: image } = await supabase.from("venue_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("venue_id", venueId)
    .single();

  if (!image) throw new Error("התמונה לא נמצאה");

  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  await supabase.from("venue_images").delete().eq("id", imageId);

  logAudit(sessionClient, "venue.image_delete", "venue", venueId, { venue: await getVenueName(supabase, venueId), path: image.storage_path });

  if (wasprimary) {
    const { data } = await supabase.from("venue_images")
      .select("id")
      .eq("venue_id", venueId)
      .order("created_at")
      .limit(1)
      .single();
    if (data?.id) {
      await supabase.from("venue_images")
        .update({ is_primary: true })
        .eq("id", data.id);
    }
  }
}

export async function updateVenueImagePrimary(
  venueId: string,
  primaryId: string
): Promise<void> {
  const sessionClient = await authorizeVenueAccess(venueId);

  const supabase = createAdminClient();
  const { data: previousPrimary } = await supabase.from("venue_images")
    .select("id")
    .eq("venue_id", venueId)
    .eq("is_primary", true)
    .maybeSingle();

  await supabase.from("venue_images")
    .update({ is_primary: false })
    .eq("venue_id", venueId);
  await supabase.from("venue_images")
    .update({ is_primary: true })
    .eq("id", primaryId)
    .eq("venue_id", venueId);

  logAudit(sessionClient, "venue.image_set_primary", "venue", venueId, {
    venue: await getVenueName(supabase, venueId),
    image_id: { from: previousPrimary?.id ?? null, to: primaryId },
  });
}
