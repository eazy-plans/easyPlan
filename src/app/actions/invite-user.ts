/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

export async function inviteUser(email: string, full_name: string, role: UserRole, password: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await (supabase.from("users") as any)
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden" };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    // role lives in app_metadata so it cannot be forged via client-side signUp;
    // the handle_new_user() trigger reads it from raw_app_meta_data.
    app_metadata: { role },
  });

  if (error) return { error: error.message };
  return { ok: true };
}
