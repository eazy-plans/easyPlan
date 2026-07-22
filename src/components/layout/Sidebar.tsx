"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";
import {
  LayoutDashboard,
  CalendarDays,
  PlusSquare,
  ListOrdered,
  Building2,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "סקירה כללית",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["admin", "venue_owner"],
  },
  {
    label: "יומן",
    href: "/calendar",
    icon: <CalendarDays size={18} />,
    roles: ["venue_owner"],
  },
  {
    label: "קביעת אירוע",
    href: "/booking",
    icon: <PlusSquare size={18} />,
    roles: ["admin", "secretary"],
  },
  {
    label: "אירועים",
    href: "/events",
    icon: <ListOrdered size={18} />,
    roles: ["admin", "secretary"],
  },
  {
    label: "אולמות",
    href: "/venues",
    icon: <Building2 size={18} />,
    roles: ["admin", "venue_owner"],
  },
  {
    label: "לידים",
    href: "/leads",
    icon: <Users size={18} />,
    roles: ["admin", "secretary"],
  },
  {
    label: "התראות",
    href: "/notifications",
    icon: <Bell size={18} />,
    roles: ["admin"],
  },
  {
    label: "הגדרות",
    href: "/settings",
    icon: <Settings size={18} />,
    roles: ["admin"],
  },
];

interface SidebarProps {
  role: UserRole;
  fullName: string;
  /** Open admin notifications (pending venues + cancellation requests). */
  notificationCount?: number;
}

export function Sidebar({ role, fullName, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const initials = fullName.trim().slice(0, 2);

  const brandMark = (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/50 text-sm font-bold text-white">
        E
      </span>
      <h1 className="text-lg font-bold tracking-tight text-white">Eazyplans</h1>
    </Link>
  );

  const navLinks = (
    <nav className="flex flex-col gap-1 flex-1">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
            pathname.startsWith(item.href)
              ? "bg-white/15 text-white font-semibold"
              : "text-white/65 hover:bg-white/10 hover:text-white"
          )}
        >
          {item.icon}
          {item.label}
          {item.href === "/notifications" && notificationCount > 0 && (
            <span className="mr-auto min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-xs font-semibold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-primary shrink-0">
        {brandMark}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="פתח תפריט"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 right-0 h-full w-64 bg-primary py-4 px-3 z-50 flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-between items-center px-2 pb-4">
          {brandMark}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        <Separator className="mb-3 bg-white/15" />

        {navLinks}

        <Separator className="mt-3 mb-3 bg-white/15" />

        <div className="flex items-center gap-2.5 px-2 pb-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-semibold text-gold-foreground">
            {initials}
          </span>
          <p className="text-sm font-medium truncate text-white">{fullName}</p>
        </div>

        <Button
          variant="ghost"
          className="justify-start gap-3 text-white/65 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          יציאה
        </Button>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-full bg-primary py-4 px-3 shrink-0">
        <div className="px-2 pb-4">
          {brandMark}
        </div>

        <Separator className="mb-3 bg-white/15" />

        {navLinks}

        <Separator className="mt-3 mb-3 bg-white/15" />

        <div className="flex items-center gap-2.5 px-2 pb-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-semibold text-gold-foreground">
            {initials}
          </span>
          <p className="text-sm font-medium truncate text-white">{fullName}</p>
        </div>

        <Button
          variant="ghost"
          className="justify-start gap-3 text-white/65 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          יציאה
        </Button>
      </aside>
    </>
  );
}
