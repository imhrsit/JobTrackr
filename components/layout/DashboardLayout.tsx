"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  applicationCount?: number;
}

export function DashboardLayout({ children, applicationCount = 0 }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col">
        <Sidebar applicationCount={applicationCount} />
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-200 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar applicationCount={applicationCount} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Header
          onMenuClick={() => setSidebarOpen((o) => !o)}
          notificationCount={0}
        />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

