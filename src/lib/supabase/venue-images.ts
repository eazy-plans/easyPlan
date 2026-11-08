import { createClient } from "@/lib/supabase/client";

const BUCKET = "venue-images";
const SIGNED_URL_TTL_SECONDS = 3600;

/** Resolves storage paths to short-lived signed URLs. Paths the caller isn't
 * allowed to read (per storage RLS) are simply omitted from the result. */
export async function getVenueImageSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const map: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  });
  return map;
}
