"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/toast";
import {
    ArrowLeft,
    MapPin,
    DollarSign,
    Calendar,
    Clock,
    ExternalLink,
    Edit,
    Trash2,
    MoreHorizontal,
    FileText,
    Users,
    GraduationCap,
    Activity,
    LinkIcon,
    Loader2,
    AlertCircle,
    Plus,
    CalendarPlus,
    StickyNote,
    RefreshCw,
    Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
    ApplicationStatus,
    WorkMode,
    ReferralStatus,
    InterviewType,
} from "@prisma/client";
import { ReferralsTab } from "@/components/applications/tabs/ReferralsTab";
import { DocumentsTab } from "@/components/applications/tabs/DocumentsTab";
import { SkillsTab } from "@/components/applications/tabs/SkillsTab";
import { InterviewsTab } from "@/components/applications/tabs/InterviewsTab";
import { ActivityTab } from "@/components/applications/tabs/ActivityTab";

// ============================================================================
// Types
// ============================================================================

interface Skill {
    id: string;
    name: string;
    category: string | null;
}

interface JobSkill {
    jobId: string;
    skillId: string;
    isRequired: boolean;
    skill: Skill;
}

interface Job {
    id: string;
    title: string;
    company: string;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    workMode: WorkMode;
    jobUrl: string | null;
    description: string | null;
    requirements: string | null;
    postedDate: string | null;
    createdAt: string;
    updatedAt: string;
    jobSkills: JobSkill[];
}

interface Referral {
    id: string;
    contactName: string;
    relationship: string | null;
    company: string | null;
    status: ReferralStatus;
    dateAsked: string | null;
    followUpDate: string | null;
    notes: string | null;
    response: string | null;
    createdAt: string;
}

interface Interview {
    id: string;
    interviewDate: string;
    interviewType: InterviewType;
    interviewerName: string | null;
    location: string | null;
    notes: string | null;
    outcome: string | null;
    completed: boolean;
    createdAt: string;
}

interface ActivityItem {
    id: string;
    activityType: string;
    description: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

interface ApplicationDetail {
    id: string;
    userId: string;
    jobId: string;
    status: ApplicationStatus;
    appliedDate: string | null;
    resumeVersion: string | null;
    coverLetter: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    job: Job;
    referrals: Referral[];
    interviews: Interview[];
    activities: ActivityItem[];
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<
    ApplicationStatus,
    { label: string; color: string; bg: string }
> = {
    SAVED: { label: "Saved", color: "text-slate-700", bg: "bg-slate-100" },
    APPLIED: { label: "Applied", color: "text-blue-700", bg: "bg-blue-100" },
    REFERRED: { label: "Referred", color: "text-purple-700", bg: "bg-purple-100" },
    INTERVIEWING: {
        label: "Interviewing",
        color: "text-amber-700",
        bg: "bg-amber-100",
    },
    OFFERED: { label: "Offered", color: "text-green-700", bg: "bg-green-100" },
    REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
};

const WORK_MODE_LABELS: Record<WorkMode, { label: string; emoji: string }> = {
    REMOTE: { label: "Remote", emoji: "🏠" },
    HYBRID: { label: "Hybrid", emoji: "🔄" },
    ONSITE: { label: "On-site", emoji: "🏢" },
};

const REFERRAL_STATUS_COLORS: Record<ReferralStatus, string> = {
    NOT_ASKED: "bg-slate-100 text-slate-700",
    ASKED: "bg-blue-100 text-blue-700",
    PENDING: "bg-amber-100 text-amber-700",
    RECEIVED: "bg-green-100 text-green-700",
    DECLINED: "bg-red-100 text-red-700",
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
    PHONE: "📞 Phone Screen",
    VIDEO: "📹 Video Call",
    ONSITE: "🏢 On-site",
    TECHNICAL: "💻 Technical",
    BEHAVIORAL: "🗣️ Behavioral",
    HR: "👤 HR",
    FINAL: "🏁 Final Round",
};

function formatSalary(
    min: number | null,
    max: number | null,
    currency: string
): string {
    const fmt = (n: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(n);

    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    if (max) return `Up to ${fmt(max)}`;
    return "Not specified";
}

function daysSince(dateStr: string | null): string {
    if (!dateStr) return "—";
    const days = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-40" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function JobDetailContent({
    applicationId,
}: {
    applicationId: string;
}) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [notesValue, setNotesValue] = useState<string | null>(null);
    const [notesEditing, setNotesEditing] = useState(false);

    // ---- Fetch application ----
    const { data, isLoading, isError, error } = useQuery<{
        application: ApplicationDetail;
    }>({
        queryKey: ["application-detail", applicationId],
        queryFn: async () => {
            const res = await fetch(`/api/applications/${applicationId}`);
            if (res.status === 404) throw new Error("not_found");
            if (res.status === 401) throw new Error("unauthorized");
            if (!res.ok) throw new Error("server_error");
            return res.json();
        },
    });

    const application = data?.application;
    const job = application?.job;

    // ---- Delete mutation ----
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/applications/${applicationId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            toast.success("Application deleted");
            queryClient.invalidateQueries({ queryKey: ["applications"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            router.push("/applications");
        },
        onError: () => toast.error("Failed to delete application"),
    });

    // ---- Save notes mutation ----
    const saveNotesMutation = useMutation({
        mutationFn: async (notes: string) => {
            const res = await fetch(`/api/applications/${applicationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });
            if (!res.ok) throw new Error("Failed to save");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Notes saved");
            setNotesEditing(false);
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
        },
        onError: () => toast.error("Failed to save notes"),
    });

    // ---- Status change mutation ----
    const statusMutation = useMutation({
        mutationFn: async (newStatus: ApplicationStatus) => {
            const res = await fetch(
                `/api/applications/${applicationId}/status`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newStatus }),
                }
            );
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: (_, newStatus) => {
            toast.success(`Status changed to ${STATUS_CONFIG[newStatus].label}`);
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
            queryClient.invalidateQueries({ queryKey: ["applications"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        },
        onError: () => toast.error("Failed to update status"),
    });

    // ---- Error states ----
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto p-6">
                <DetailSkeleton />
            </div>
        );
    }

    if (isError) {
        const errMsg =
            error?.message === "not_found"
                ? "This application was not found or you don't have access."
                : error?.message === "unauthorized"
                    ? "You need to sign in to view this page."
                    : "Something went wrong while loading this application.";

        return (
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 rounded-full bg-destructive/10 mb-4">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                        {error?.message === "not_found"
                            ? "Application Not Found"
                            : "Error"}
                    </h2>
                    <p className="text-muted-foreground mb-6">{errMsg}</p>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/applications")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Applications
                    </Button>
                </div>
            </div>
        );
    }

    if (!application || !job) return null;

    const sc = STATUS_CONFIG[application.status];
    const wm = WORK_MODE_LABELS[job.workMode];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            {/* ================================================================
                HEADER
            ================================================================ */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 mt-1"
                        onClick={() => router.push("/applications")}
                        aria-label="Back to applications"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {job.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                                {job.company.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-lg">{job.company}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            router.push(`/jobs/${applicationId}/edit`)
                        }
                    >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Edit
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() =>
                                    toast.info("Add referral coming soon")
                                }
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Add Referral
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    toast.info("Schedule interview coming soon")
                                }
                            >
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Schedule Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setNotesEditing(true);
                                    const el = document.getElementById(
                                        "notes-section"
                                    );
                                    el?.scrollIntoView({ behavior: "smooth" });
                                }}
                            >
                                <StickyNote className="h-4 w-4 mr-2" />
                                Add Note
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Change Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {Object.entries(STATUS_CONFIG).map(
                                        ([s, c]) => (
                                            <DropdownMenuItem
                                                key={s}
                                                disabled={
                                                    s ===
                                                    application.status
                                                }
                                                onClick={() =>
                                                    statusMutation.mutate(
                                                        s as ApplicationStatus
                                                    )
                                                }
                                            >
                                                <span
                                                    className={`inline-block w-2 h-2 rounded-full mr-2 ${c.bg}`}
                                                />
                                                {c.label}
                                            </DropdownMenuItem>
                                        )
                                    )}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ================================================================
                METADATA CARDS
            ================================================================ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Status */}
                <Card className="py-3 gap-0">
                    <CardContent className="px-4 py-0">
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge className={`${sc.bg} ${sc.color} border-0 text-sm font-semibold`}>
                            {sc.label}
                        </Badge>
                    </CardContent>
                </Card>

                {/* Location */}
                <Card className="py-3 gap-0">
                    <CardContent className="px-4 py-0">
                        <p className="text-xs text-muted-foreground mb-1">
                            Location
                        </p>
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                                {job.location || "Not specified"}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {wm.emoji} {wm.label}
                        </p>
                    </CardContent>
                </Card>

                {/* Salary */}
                <Card className="py-3 gap-0">
                    <CardContent className="px-4 py-0">
                        <p className="text-xs text-muted-foreground mb-1">
                            Salary
                        </p>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                            <DollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                                {formatSalary(
                                    job.salaryMin,
                                    job.salaryMax,
                                    job.salaryCurrency
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Applied Date */}
                <Card className="py-3 gap-0">
                    <CardContent className="px-4 py-0">
                        <p className="text-xs text-muted-foreground mb-1">
                            Applied
                        </p>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>
                                {application.appliedDate
                                    ? format(
                                        new Date(application.appliedDate),
                                        "MMM d, yyyy"
                                    )
                                    : "Not yet"}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Days Since */}
                <Card className="py-3 gap-0">
                    <CardContent className="px-4 py-0">
                        <p className="text-xs text-muted-foreground mb-1">
                            Days Since
                        </p>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>
                                {daysSince(
                                    application.appliedDate ??
                                    application.createdAt
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ================================================================
                TABS
            ================================================================ */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full flex overflow-x-auto">
                    <TabsTrigger value="overview" className="flex-1 gap-1.5">
                        <FileText className="h-4 w-4 hidden sm:block" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="referrals" className="flex-1 gap-1.5">
                        <Users className="h-4 w-4 hidden sm:block" />
                        Referrals
                        {application.referrals.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                {application.referrals.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 gap-1.5">
                        <Paperclip className="h-4 w-4 hidden sm:block" />
                        Documents
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="flex-1 gap-1.5">
                        <GraduationCap className="h-4 w-4 hidden sm:block" />
                        Skills
                    </TabsTrigger>
                    <TabsTrigger value="interviews" className="flex-1 gap-1.5">
                        <Calendar className="h-4 w-4 hidden sm:block" />
                        Interviews
                        {application.interviews.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                {application.interviews.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 gap-1.5">
                        <Activity className="h-4 w-4 hidden sm:block" />
                        Activity
                    </TabsTrigger>
                </TabsList>

                {/* ============================================================
                    OVERVIEW TAB
                ============================================================ */}
                <TabsContent value="overview" className="space-y-6 mt-4">
                    {/* Job URL */}
                    {job.jobUrl && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                    <a
                                        href={job.jobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm truncate"
                                    >
                                        {job.jobUrl}
                                    </a>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Description */}
                    {job.description && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Job Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {job.description}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Requirements */}
                    {job.requirements && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Requirements
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {job.requirements}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Posted Date & Resume */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {job.postedDate && (
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Posted Date
                                    </p>
                                    <p className="text-sm font-medium">
                                        {format(
                                            new Date(job.postedDate),
                                            "MMMM d, yyyy"
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                        {application.resumeVersion && (
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Resume Version
                                    </p>
                                    <p className="text-sm font-medium">
                                        {application.resumeVersion}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Cover Letter */}
                    {application.coverLetter && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Cover Letter
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.coverLetter}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes */}
                    <Card id="notes-section">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    Notes
                                </CardTitle>
                                {!notesEditing && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setNotesValue(
                                                application.notes ?? ""
                                            );
                                            setNotesEditing(true);
                                        }}
                                    >
                                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {notesEditing ? (
                                <div className="space-y-3">
                                    <Textarea
                                        value={
                                            notesValue ??
                                            application.notes ??
                                            ""
                                        }
                                        onChange={(e) =>
                                            setNotesValue(e.target.value)
                                        }
                                        placeholder="Add your notes here..."
                                        rows={5}
                                        className="resize-y"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setNotesEditing(false);
                                                setNotesValue(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={
                                                saveNotesMutation.isPending
                                            }
                                            onClick={() =>
                                                saveNotesMutation.mutate(
                                                    notesValue ??
                                                    application.notes ??
                                                    ""
                                                )
                                            }
                                        >
                                            {saveNotesMutation.isPending && (
                                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                            )}
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ) : application.notes ? (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.notes}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    No notes yet. Click Edit to add notes.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Show placeholder if no content at all */}
                    {!job.description &&
                        !job.requirements &&
                        !job.jobUrl &&
                        !application.coverLetter &&
                        !application.notes && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">
                                    No overview details added yet.
                                </p>
                                <p className="text-sm text-muted-foreground/70 mt-1">
                                    Edit this job to add description,
                                    requirements, or notes.
                                </p>
                            </div>
                        )}
                </TabsContent>

                {/* ============================================================
                    REFERRALS TAB
                ============================================================ */}
                <TabsContent value="referrals" className="mt-4">
                    <ReferralsTab
                        applicationId={application.id}
                        initialReferrals={application.referrals}
                    />
                </TabsContent>

                {/* ============================================================
                    DOCUMENTS TAB
                ============================================================ */}
                <TabsContent value="documents" className="mt-4">
                    <DocumentsTab
                        applicationId={application.id}
                        application={{
                            id: application.id,
                            resumeVersion: application.resumeVersion,
                            coverLetter: application.coverLetter,
                            notes: application.notes,
                            job: {
                                title: job.title,
                                company: job.company,
                                jobUrl: job.jobUrl,
                            },
                        }}
                    />
                </TabsContent>

                {/* ============================================================
                    SKILLS TAB
                ============================================================ */}
                <TabsContent value="skills" className="mt-4">
                    <SkillsTab
                        applicationId={application.id}
                        jobSkills={job.jobSkills}
                    />
                </TabsContent>

                {/* ============================================================
                    INTERVIEWS TAB
                ============================================================ */}
                <TabsContent value="interviews" className="mt-4">
                    <InterviewsTab
                        applicationId={application.id}
                        initialInterviews={application.interviews}
                    />
                </TabsContent>

                {/* ============================================================
                    ACTIVITY TAB
                ============================================================ */}
                <TabsContent value="activity" className="mt-4">
                    <ActivityTab
                        applicationId={application.id}
                        activities={application.activities}
                    />
                </TabsContent>
            </Tabs>

            {/* ================================================================
                DELETE CONFIRMATION
            ================================================================ */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Application</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>
                                {job.title} at {job.company}
                            </strong>
                            ? This will also delete all referrals, interviews,
                            and activity history. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
