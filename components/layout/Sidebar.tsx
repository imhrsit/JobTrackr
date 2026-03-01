"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const bottomNav = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/help", label: "Help & Feedback", icon: HelpCircle },
];

interface SidebarProps {
  applicationCount?: number;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ applicationCount = 0, onClose, className }: SidebarProps) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground"
    );

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-background transition-transform",
        className
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">JobTrackr</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-4">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={linkClass(item.href)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.label === "Applications" && applicationCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {applicationCount}
              </Badge>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4 space-y-1">
        {bottomNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={linkClass(item.href)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
        <Separator className="my-2" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
