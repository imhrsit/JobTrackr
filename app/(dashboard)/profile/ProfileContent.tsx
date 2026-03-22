"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Briefcase, Settings, ShieldAlert } from "lucide-react";
import { ProfileTab } from "./_components/ProfileTab";
import { SkillsTab } from "./_components/SkillsTab";
import { PreferencesTab } from "./_components/PreferencesTab";
import { AccountTab } from "./_components/AccountTab";

// ============================================================================
// Types (shared across all profile sub-tabs)
// ============================================================================

export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    bio: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    image: string | null;
    preferences: UserPreferences | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserPreferences {
    notifications: {
        statusChanges: boolean;
        interviewReminders: boolean;
        referralFollowUps: boolean;
        weeklySummary: boolean;
        monthlyInsights: boolean;
    };
    display: {
        defaultView: "kanban" | "list" | "table";
        compactMode: boolean;
    };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    notifications: {
        statusChanges: false,
        interviewReminders: false,
        referralFollowUps: false,
        weeklySummary: false,
        monthlyInsights: false,
    },
    display: {
        defaultView: "kanban",
        compactMode: false,
    },
};

// ============================================================================
// Component
// ============================================================================

export function ProfileContent() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<{ user: UserProfile }>({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/users/profile");
            if (!res.ok) throw new Error("Failed to fetch profile");
            return res.json();
        },
        staleTime: 60_000,
    });

    const onUpdate = () => queryClient.invalidateQueries({ queryKey: ["profile"] });

    if (isLoading || !data) {
        return <ProfileSkeleton />;
    }

    const user = data.user;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    Profile & Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your account and preferences
                </p>
            </div>

            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="profile" className="gap-2 py-2">
                        <User className="h-3.5 w-3.5 hidden sm:block" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="gap-2 py-2">
                        <Briefcase className="h-3.5 w-3.5 hidden sm:block" />
                        Skills
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2 py-2">
                        <Settings className="h-3.5 w-3.5 hidden sm:block" />
                        Preferences
                    </TabsTrigger>
                    <TabsTrigger value="account" className="gap-2 py-2">
                        <ShieldAlert className="h-3.5 w-3.5 hidden sm:block" />
                        Account
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <ProfileTab user={user} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="skills" className="mt-6">
                    <SkillsTab />
                </TabsContent>

                <TabsContent value="preferences" className="mt-6">
                    <PreferencesTab user={user} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="account" className="mt-6">
                    <AccountTab user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
