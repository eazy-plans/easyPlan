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
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    label: "הגדרות",
    href: "/settings",
    icon: <Settings size={18} />,
    roles: ["admin"],
  },
];

interface SidebarProps {
  role: UserRole;
  fullName: string;
}

export function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex flex-col w-56 h-full bg-card border-l border-border py-4 px-3 shrink-0">
      {/* Logo */}
      <div className="px-2 pb-4">
        <h1 className="text-xl font-bold tracking-tight">Eazyplans</h1>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{fullName}</p>
      </div>

      <Separator className="mb-3" />

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <Separator className="mt-3 mb-3" />

      {/* Logout */}
      <Button
        variant="ghost"
        className="justify-start gap-3 text-muted-foreground hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        יציאה
      </Button>
    </aside>
  );
}
