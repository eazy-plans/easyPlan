import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";

// React cache() deduplicates these calls within a single request render tree.
// Both AppLayout and any page can call getUserProfile() - only one DB round trip happens.

export const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single() as { data: { role: UserRole; full_name: string } | null };

  if (!profile) redirect("/login");

  return { supabase, user, profile };
});
