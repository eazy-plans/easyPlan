import type { UserRole } from "@/types/database";

/**
 * Landing page per role. Single source of truth - the proxy (middleware) and
 * the login page previously kept separate copies that disagreed on where a
 * venue_owner lands. Kept dependency-free so the middleware bundle stays lean.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard",
  secretary: "/booking",
  venue_owner: "/dashboard",
};
