import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard",
  secretary: "/booking",
  venue_owner: "/dashboard",
};

export async function proxy(request: NextRequest) {
  // Skip auth when Supabase is not yet configured (local dev before setup)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl.startsWith("http")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes — always accessible
  if (pathname.startsWith("/login") || pathname.startsWith("/api/cron")) {
    // If user is already logged in and hits /login, redirect to their home
    if (user && pathname === "/login") {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single() as { data: { role: string } | null };

      const role = (profile?.role as UserRole) ?? "secretary";
      return NextResponse.redirect(
        new URL(ROLE_HOME[role], request.url)
      );
    }
    return supabaseResponse;
  }

  // Protected routes — redirect to login if not authenticated
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control for specific routes
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  const role = (profile?.role as UserRole) ?? "secretary";

  // Leads page — admin and secretary only
  if (pathname.startsWith("/leads") && !["admin", "secretary"].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  // Settings page — admin only
  if (pathname.startsWith("/settings") && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
