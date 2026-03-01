"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
    User,
    Settings,
    HelpCircle,
    LogOut,
    Sun,
    Moon,
    Monitor,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Types
// ============================================================================

export interface UserDropdownProps {
    /** Override alignment of the dropdown. Defaults to "end". */
    align?: "start" | "center" | "end";
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name?: string | null, email?: string | null): string {
    if (name) {
        return name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }
    return (email ?? "U").charAt(0).toUpperCase();
}

const THEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
] as const;

// ============================================================================
// Component
// ============================================================================

export function UserDropdown({ align = "end" }: UserDropdownProps) {
    const { data: session, status } = useSession();
    const { theme, setTheme } = useTheme();
    const [signingOut, setSigningOut] = useState(false);

    // Loading state
    if (status === "loading") {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
            </div>
        );
    }

    // No session
    if (!session?.user) {
        return (
            <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
            </Button>
        );
    }

    const user = session.user;
    const initials = getInitials(user.name, user.email);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut({ callbackUrl: "/login" });
            toast.success("Signed out successfully");
        } catch {
            toast.error("Failed to sign out");
            setSigningOut(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                    aria-label="User menu"
                >
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                        <AvatarFallback className="text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={align} className="w-64" sideOffset={8}>
                {/* ---- Section 1: User Info ---- */}
                <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage
                                src={user.image ?? undefined}
                                alt={user.name ?? ""}
                            />
                            <AvatarFallback className="text-sm font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold truncate">
                                {user.name ?? "User"}
                            </span>
                            {user.email && (
                                <span className="text-xs font-normal text-muted-foreground truncate">
                                    {user.email}
                                </span>
                            )}
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* ---- Section 2: Quick Actions ---- */}
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Manage Account</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            href="/dashboard/settings"
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="flex items-center gap-2 cursor-pointer"
                        onSelect={(e) => {
                            e.preventDefault();
                            toast.info("Help & Support coming soon!");
                        }}
                    >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Help & Support</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* ---- Section 3: Theme Switcher ---- */}
                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-3 py-1.5">
                    Theme
                </DropdownMenuLabel>
                <div className="flex items-center gap-1 px-2 pb-2">
                    {THEME_OPTIONS.map((option) => {
                        const isActive = theme === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => setTheme(option.value)}
                                className={`
                  flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5
                  text-xs font-medium transition-colors cursor-pointer
                  ${isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }
                `}
                                aria-label={`Switch to ${option.label} theme`}
                            >
                                <option.icon className="h-3.5 w-3.5" />
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                <DropdownMenuSeparator />

                {/* ---- Section 4: Sign Out ---- */}
                <DropdownMenuItem
                    className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                    disabled={signingOut}
                    onSelect={(e) => {
                        e.preventDefault();
                        handleSignOut();
                    }}
                >
                    {signingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
