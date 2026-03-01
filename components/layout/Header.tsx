"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserDropdown } from "./UserDropdown";

interface HeaderProps {
  onMenuClick?: () => void;
  notificationCount?: number;
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return [{ label: "Dashboard", href: "/dashboard" }];
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];
  let href = "";
  for (let i = 1; i < segments.length; i++) {
    href += `/${segments[i]}`;
    const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
    crumbs.push({ label, href: `/dashboard${href}` });
  }
  return crumbs;
}

export function Header({ onMenuClick, notificationCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 transition-colors md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <Link
              href={crumb.href}
              className={cn(
                "hover:text-foreground transition-colors",
                i === breadcrumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Search (coming soon)">
          <Search className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full p-0 text-[10px]"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </Badge>
          )}
        </Button>

        <UserDropdown />
      </div>
    </header>
  );
}

