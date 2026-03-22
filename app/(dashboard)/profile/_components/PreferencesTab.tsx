"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, LayoutGrid, List, Table2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UserProfile, UserPreferences } from "../ProfileContent";
import { DEFAULT_PREFERENCES } from "../ProfileContent";

// ============================================================================
// Helpers
// ============================================================================

function mergePreferences(existing: UserPreferences | null, override: Partial<UserPreferences>): UserPreferences {
    const base = existing ?? DEFAULT_PREFERENCES;
    return {
        notifications: { ...base.notifications, ...(override.notifications ?? {}) },
        display: { ...base.display, ...(override.display ?? {}) },
    };
}

// ============================================================================
// Toggle group
// ============================================================================

interface ToggleGroupProps<T extends string> {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; icon?: React.ReactNode }[];
    disabled?: boolean;
}

function ToggleGroup<T extends string>({ value, onChange, options, disabled }: ToggleGroupProps<T>) {
    return (
        <div className={cn("flex items-center border rounded-lg overflow-hidden w-fit", disabled && "opacity-50 cursor-not-allowed")}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => !disabled && onChange(opt.value)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                        disabled ? "cursor-not-allowed" : "cursor-pointer",
                        value === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    {opt.icon}
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function ComingSoonBadge() {
    return (
        <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Coming soon
        </span>
    );
}

// ============================================================================
// Component
// ============================================================================

interface Props {
    user: UserProfile;
    onUpdate: () => void;
}

export function PreferencesTab({ user }: Props) {
    const { theme, setTheme } = useTheme();

    const currentPrefs = mergePreferences(user.preferences, {});
    const [notifications] = useState(currentPrefs.notifications);
    const [display] = useState(currentPrefs.display);

    const NOTIFICATION_ITEMS: { key: keyof typeof notifications; label: string; description: string }[] = [
        { key: "statusChanges", label: "Application status changes", description: "When an application's status is updated" },
        { key: "interviewReminders", label: "Interview reminders", description: "1 hour and 1 day before interviews" },
        { key: "referralFollowUps", label: "Referral follow-ups", description: "Reminders to follow up with referrals" },
        { key: "weeklySummary", label: "Weekly summary", description: "A weekly digest of your job search activity" },
        { key: "monthlyInsights", label: "Monthly insights", description: "Monthly analytics and recommendations" },
    ];

    return (
        <div className="space-y-6">
            {/* ── Theme ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Appearance</CardTitle>
                    <CardDescription>Choose how JobTrackr looks for you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-medium">Theme</p>
                            <p className="text-xs text-muted-foreground">
                                Syncs with your OS when set to System
                            </p>
                        </div>
                        <ToggleGroup
                            value={(theme as "light" | "dark" | "system") ?? "system"}
                            onChange={setTheme}
                            options={[
                                { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
                                { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
                                { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
                            ]}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                                Default View
                                <ComingSoonBadge />
                            </p>
                            <p className="text-xs text-muted-foreground">
                                How applications are displayed on the board
                            </p>
                        </div>
                        <ToggleGroup
                            value={display.defaultView}
                            onChange={() => {}}
                            disabled
                            options={[
                                { value: "kanban", label: "Kanban", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                                { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
                                { value: "table", label: "Table", icon: <Table2 className="h-3.5 w-3.5" /> },
                            ]}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="compact-mode" className="text-sm font-medium flex items-center gap-2">
                                Compact Mode
                                <ComingSoonBadge />
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Reduce card padding for a denser layout
                            </p>
                        </div>
                        <Switch
                            id="compact-mode"
                            checked={display.compactMode}
                            disabled
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Notifications ── */}
            <Card className="opacity-60">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        Notifications
                        <ComingSoonBadge />
                    </CardTitle>
                    <CardDescription>
                        Email notifications are not yet active. These settings will take effect in a future update.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {NOTIFICATION_ITEMS.map((item, i) => (
                        <div key={item.key}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label
                                        htmlFor={`notif-${item.key}`}
                                        className="text-sm font-medium"
                                    >
                                        {item.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                                <Switch
                                    id={`notif-${item.key}`}
                                    checked={notifications[item.key]}
                                    disabled
                                />
                            </div>
                            {i < NOTIFICATION_ITEMS.length - 1 && (
                                <Separator className="mt-4" />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ── Privacy (placeholder) ── */}
            <Card className="opacity-60">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        Privacy
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Coming soon
                        </span>
                    </CardTitle>
                    <CardDescription>
                        Profile visibility and data sharing preferences will be available in a future update.
                    </CardDescription>
                </CardHeader>
            </Card>

        </div>
    );
}
