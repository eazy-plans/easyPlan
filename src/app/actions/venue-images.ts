"use server";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "venue-images";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadVenueImage(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  const venueId = formData.get("venueId") as string;
  const isPrimary = formData.get("isPrimary") === "true";

  const supabase = adminClient();

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file);

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
  const supabase = adminClient();

  await supabase.storage.from(BUCKET).remove([storagePath]);
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
  const supabase = adminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("venue_images") as any)
    .update({ is_primary: false })
    .eq("venue_id", venueId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("venue_images") as any)
    .update({ is_primary: true })
    .eq("id", primaryId);
}
