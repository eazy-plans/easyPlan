"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const BUCKET = "venue-images";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Ensures the caller is signed in and may manage images for `venueId`
 * (admins, or the owner of that venue). Throws otherwise. Server actions are
 * public HTTP endpoints, so this check is the only thing standing between the
 * service-role key and an anonymous caller - never remove it.
 */
async function authorizeVenueAccess(venueId: string): Promise<void> {
  if (!venueId) throw new Error("Missing venueId");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("users") as any)
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: venue } = await (supabase.from("venues") as any)
    .select("owner_user_id")
    .eq("id", venueId)
    .single();

  if (!venue || venue.owner_user_id !== user.id) throw new Error("Forbidden");
}

export async function uploadVenueImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  const venueId = formData.get("venueId") as string;
  const isPrimary = formData.get("isPrimary") === "true";

  await authorizeVenueAccess(venueId);

  if (!(file instanceof File)) throw new Error("No file provided");
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error("File too large");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");

  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`;

  const supabase = adminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase.from("venue_images") as any).insert({
    venue_id: venueId,
    storage_path: path,
    is_primary: isPrimary,
  });

  if (dbError) throw new Error(dbError.message);

  return path;
}

export async function deleteVenueImage(
  imageId: string,
  storagePath: string,
  wasprimary: boolean,
  venueId: string
): Promise<void> {
  await authorizeVenueAccess(venueId);

  const supabase = adminClient();

  // Confirm the image actually belongs to this venue before touching storage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image } = await (supabase.from("venue_images") as any)
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("venue_id", venueId)
    .single();

  if (!image) throw new Error("Image not found");

  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("venue_images") as any).delete().eq("id", imageId);

  if (wasprimary) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("venue_images") as any)
      .select("id")
      .eq("venue_id", venueId)
      .order("created_at")
      .limit(1)
      .single();
    if (data?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("venue_images") as any)
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

  const supabase = adminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("venue_images") as any)
    .update({ is_primary: false })
    .eq("venue_id", venueId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("venue_images") as any)
    .update({ is_primary: true })
    .eq("id", primaryId)
    .eq("venue_id", venueId);
}
