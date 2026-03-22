"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "./UserDropdown";

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  applications: "Applications",
  analytics: "Analytics",
  profile: "Profile",
  new: "New",
};

const ROUTE_HREF_OVERRIDES: Record<string, string> = {
  jobs: "/applications",
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || pathname === "/dashboard") {
    return [{ label: "Dashboard", href: "/dashboard" }];
  }
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];
  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    if (href === "/dashboard") continue;
    const label = ROUTE_LABELS[segment] ?? (segment in ROUTE_HREF_OVERRIDES ? "Applications" : "Details");
    const resolvedHref = ROUTE_HREF_OVERRIDES[segment] ?? href;
    crumbs.push({ label, href: resolvedHref });
  }
  return crumbs;
}

export function Header({ onMenuClick, sidebarOpen = false }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 transition-colors md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        aria-expanded={sidebarOpen}
        aria-controls="mobile-nav-drawer"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm">
        <ol className="flex items-center gap-2 list-none p-0 m-0">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground" aria-hidden="true">/</span>}
                <Link
                  href={crumb.href}
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    isLast ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <UserDropdown />
      </div>
    </header>
  );
}

