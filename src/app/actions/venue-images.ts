"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const BUCKET = "venue-images";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

/**
 * Ensures the caller is signed in and may manage images for `venueId`
 * (admins, or the owner of that venue). Throws otherwise. Server actions are
 * public HTTP endpoints, so this check is the only thing standing between the
 * service-role key and an anonymous caller - never remove it.
 */
async function authorizeVenueAccess(venueId: string): Promise<void> {
  if (!venueId) throw new Error("חסר מזהה אולם");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("אין הרשאה");

  const { data: profile } = await supabase.from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return;

  const { data: venue } = await supabase.from("venues")
    .select("owner_user_id")
    .eq("id", venueId)
    .single();

  if (!venue || venue.owner_user_id !== user.id) throw new Error("אין הרשאה לבצע פעולה זו");
}

export async function uploadVenueImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  const venueId = formData.get("venueId") as string;
  const isPrimary = formData.get("isPrimary") === "true";

  await authorizeVenueAccess(venueId);

  if (!(file instanceof File)) throw new Error("לא נבחר קובץ");
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error("הקובץ גדול מדי (מקסימום 8MB)");
  if (!file.type.startsWith("image/")) throw new Error("ניתן להעלות קבצי תמונה בלבד");

  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from("venue_images").insert({
    venue_id: venueId,
    storage_path: path,
    is_primary: isPrimary,
  });

  if (dbError) throw new Error(dbError.message);

  return path;
}

export async function deleteVenueImage(
  imageId: string,
  wasprimary: boolean,
  venueId: string
): Promise<void> {
  await authorizeVenueAccess(venueId);

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
  await authorizeVenueAccess(venueId);

  const supabase = createAdminClient();
  await supabase.from("venue_images")
    .update({ is_primary: false })
    .eq("venue_id", venueId);
  await supabase.from("venue_images")
    .update({ is_primary: true })
    .eq("id", primaryId)
    .eq("venue_id", venueId);
}
