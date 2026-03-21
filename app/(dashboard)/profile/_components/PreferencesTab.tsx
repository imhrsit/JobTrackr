"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "@/lib/toast";
import { Loader2, Sun, Moon, Monitor, LayoutGrid, List, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

function ToggleGroup<T extends string>({ value, onChange, options }: ToggleGroupProps<T>) {
    return (
        <div className="flex items-center border rounded-lg overflow-hidden w-fit">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
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

// ============================================================================
// Component
// ============================================================================

interface Props {
    user: UserProfile;
    onUpdate: () => void;
}

export function PreferencesTab({ user, onUpdate }: Props) {
    const { theme, setTheme } = useTheme();
    const [saving, setSaving] = useState(false);

    const currentPrefs = mergePreferences(user.preferences, {});

    const [notifications, setNotifications] = useState(currentPrefs.notifications);
    const [display, setDisplay] = useState(currentPrefs.display);

    const NOTIFICATION_ITEMS: { key: keyof typeof notifications; label: string; description: string }[] = [
        { key: "statusChanges", label: "Application status changes", description: "When an application's status is updated" },
        { key: "interviewReminders", label: "Interview reminders", description: "1 hour and 1 day before interviews" },
        { key: "referralFollowUps", label: "Referral follow-ups", description: "Reminders to follow up with referrals" },
        { key: "weeklySummary", label: "Weekly summary", description: "A weekly digest of your job search activity" },
        { key: "monthlyInsights", label: "Monthly insights", description: "Monthly analytics and recommendations" },
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preferences: { notifications, display },
                }),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast.success("Preferences saved");
            onUpdate();
        } catch {
            toast.error("Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

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
                            <p className="text-sm font-medium">Default View</p>
                            <p className="text-xs text-muted-foreground">
                                How applications are displayed on the board
                            </p>
                        </div>
                        <ToggleGroup
                            value={display.defaultView}
                            onChange={(v) => setDisplay((d) => ({ ...d, defaultView: v }))}
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
                            <Label htmlFor="compact-mode" className="text-sm font-medium cursor-pointer">
                                Compact Mode
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Reduce card padding for a denser layout
                            </p>
                        </div>
                        <Switch
                            id="compact-mode"
                            checked={display.compactMode}
                            onCheckedChange={(v) => setDisplay((d) => ({ ...d, compactMode: v }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Notifications ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Notifications</CardTitle>
                    <CardDescription>
                        Configure which email notifications you receive.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {NOTIFICATION_ITEMS.map((item, i) => (
                        <div key={item.key}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label
                                        htmlFor={`notif-${item.key}`}
                                        className="text-sm font-medium cursor-pointer"
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
                                    onCheckedChange={(v) =>
                                        setNotifications((n) => ({ ...n, [item.key]: v }))
                                    }
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

            <Separator />

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Preferences
                </Button>
            </div>
        </div>
    );
}
