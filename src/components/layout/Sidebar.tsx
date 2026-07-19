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

  const navLinks = (
    <nav className="flex flex-col gap-1 flex-1">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Eazyplans</h1>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded-md hover:bg-muted transition-colors"
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
          "md:hidden fixed top-0 right-0 h-full w-56 bg-card border-l border-border py-4 px-3 z-50 flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-between items-center px-2 pb-4">
          <h1 className="text-xl font-bold tracking-tight">Eazyplans</h1>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        <Separator className="mb-3" />

        {navLinks}

        <Separator className="mt-3 mb-3" />

        <Button
          variant="ghost"
          className="justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          יציאה
        </Button>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-full bg-card border-l border-border py-4 px-3 shrink-0">
        <div className="px-2 pb-4">
          <h1 className="text-xl font-bold tracking-tight">Eazyplans</h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{fullName}</p>
        </div>

        <Separator className="mb-3" />

        {navLinks}

        <Separator className="mt-3 mb-3" />

        <Button
          variant="ghost"
          className="justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          יציאה
        </Button>
      </aside>
    </>
  );
}
