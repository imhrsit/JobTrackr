"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    format,
    formatDistanceToNow,
    isToday,
    isYesterday,
} from "date-fns";
import { toast } from "sonner";
import {
    Plus,
    ArrowRight,
    UserPlus,
    Calendar,
    CheckCircle2,
    FileText,
    Upload,
    Search,
    Filter,
    Loader2,
    ChevronDown,
    Briefcase,
    MessageSquare,
    Trash2,
    XCircle,
    Clock,
    Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

export interface Activity {
    id: string;
    activityType: string;
    description: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

type ActivityFilter =
    | "all"
    | "status_changed"
    | "note_added"
    | "referral"
    | "interview"
    | "document";

// ============================================================================
// Constants
// ============================================================================

const ACTIVITY_CONFIG: Record<
    string,
    {
        icon: React.ElementType;
        label: string;
        dotColor: string;
        iconColor: string;
    }
> = {
    application_created: {
        icon: Briefcase,
        label: "Application created",
        dotColor: "bg-blue-500",
        iconColor: "text-blue-600",
    },
    job_created: {
        icon: Plus,
        label: "Job created",
        dotColor: "bg-green-500",
        iconColor: "text-green-600",
    },
    status_changed: {
        icon: ArrowRight,
        label: "Status changed",
        dotColor: "bg-primary",
        iconColor: "text-primary",
    },
    referral_added: {
        icon: UserPlus,
        label: "Referral added",
        dotColor: "bg-purple-500",
        iconColor: "text-purple-600",
    },
    referral_updated: {
        icon: UserPlus,
        label: "Referral updated",
        dotColor: "bg-purple-400",
        iconColor: "text-purple-500",
    },
    referral_deleted: {
        icon: Trash2,
        label: "Referral removed",
        dotColor: "bg-red-400",
        iconColor: "text-red-500",
    },
    interview_scheduled: {
        icon: Calendar,
        label: "Interview scheduled",
        dotColor: "bg-orange-500",
        iconColor: "text-orange-600",
    },
    interview_completed: {
        icon: CheckCircle2,
        label: "Interview completed",
        dotColor: "bg-green-500",
        iconColor: "text-green-600",
    },
    interview_cancelled: {
        icon: XCircle,
        label: "Interview cancelled",
        dotColor: "bg-red-400",
        iconColor: "text-red-500",
    },
    interview_updated: {
        icon: Calendar,
        label: "Interview updated",
        dotColor: "bg-orange-400",
        iconColor: "text-orange-500",
    },
    note_added: {
        icon: MessageSquare,
        label: "Note added",
        dotColor: "bg-slate-400",
        iconColor: "text-slate-500",
    },
    document_updated: {
        icon: Upload,
        label: "Documents updated",
        dotColor: "bg-blue-400",
        iconColor: "text-blue-500",
    },
    resume_updated: {
        icon: FileText,
        label: "Resume updated",
        dotColor: "bg-blue-400",
        iconColor: "text-blue-500",
    },
    cover_letter_updated: {
        icon: FileText,
        label: "Cover letter updated",
        dotColor: "bg-indigo-400",
        iconColor: "text-indigo-500",
    },
};

const DEFAULT_CONFIG = {
    icon: Clock,
    label: "Activity",
    dotColor: "bg-muted-foreground/50",
    iconColor: "text-muted-foreground",
};

const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
    { value: "all", label: "All Activity" },
    { value: "status_changed", label: "Status Changes" },
    { value: "note_added", label: "Notes" },
    { value: "referral", label: "Referrals" },
    { value: "interview", label: "Interviews" },
    { value: "document", label: "Documents" },
];

// ============================================================================
// Helpers
// ============================================================================

function getDateGroupLabel(dateStr: string): string {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
}

function matchesFilter(type: string, filter: ActivityFilter): boolean {
    if (filter === "all") return true;
    if (filter === "status_changed") return type === "status_changed";
    if (filter === "note_added") return type === "note_added";
    if (filter === "referral")
        return type.startsWith("referral_");
    if (filter === "interview")
        return type.startsWith("interview_");
    if (filter === "document")
        return ["document_updated", "resume_updated", "cover_letter_updated"].includes(type);
    return true;
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivityTab({
    applicationId,
    activities,
}: {
    applicationId: string;
    activities: Activity[];
}) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<ActivityFilter>("all");
    const [search, setSearch] = useState("");
    const [addNoteOpen, setAddNoteOpen] = useState(false);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");

    // ---- Filtered activities ----
    const filtered = useMemo(() => {
        let list = activities;

        if (filter !== "all") {
            list = list.filter((a) => matchesFilter(a.activityType, filter));
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((a) =>
                a.description.toLowerCase().includes(q)
            );
        }

        return list;
    }, [activities, filter, search]);

    // ---- Group by date ----
    const grouped = useMemo(() => {
        const groups: { label: string; items: Activity[] }[] = [];
        let currentLabel = "";

        for (const act of filtered) {
            const label = getDateGroupLabel(act.createdAt);
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, items: [act] });
            } else {
                groups[groups.length - 1].items.push(act);
            }
        }

        return groups;
    }, [filtered]);

    // ---- Add note mutation ----
    const addNoteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/applications/${applicationId}/activities`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: noteTitle.trim() || undefined,
                        description: noteContent.trim(),
                    }),
                }
            );
            if (!res.ok) throw new Error("Failed to add note");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Note added");
            setAddNoteOpen(false);
            setNoteTitle("");
            setNoteContent("");
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
        },
        onError: () => toast.error("Failed to add note"),
    });

    // ---- Filter label ----
    const activeFilterLabel =
        FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? "All Activity";

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                    Activity Timeline
                    {activities.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {activities.length}
                        </Badge>
                    )}
                </h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                            >
                                <Filter className="h-3 w-3 mr-1.5" />
                                {activeFilterLabel}
                                <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {FILTER_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                    key={opt.value}
                                    disabled={opt.value === filter}
                                    onClick={() => setFilter(opt.value)}
                                >
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" onClick={() => setAddNoteOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Note
                    </Button>
                </div>
            </div>

            {/* Search */}
            {activities.length > 5 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search timeline..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            )}

            {/* Empty state */}
            {activities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No activity yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Activity will be logged automatically as you make
                        changes.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddNoteOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add a Note
                    </Button>
                </div>
            )}

            {/* Filtered empty */}
            {activities.length > 0 && filtered.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground italic">
                    No activities match your filter
                    {search && ` for "${search}"`}.
                </div>
            )}

            {/* ================================================================
                TIMELINE
            ================================================================ */}
            {grouped.length > 0 && (
                <div className="relative ml-1">
                    {/* Connecting line */}
                    <div className="absolute left-[15px] top-8 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                        {grouped.map((group) => (
                            <div key={group.label}>
                                {/* Date header */}
                                <div className="relative flex items-center py-3 pl-10">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.label}
                                    </p>
                                </div>

                                {/* Activities in group */}
                                {group.items.map((act) => {
                                    const config =
                                        ACTIVITY_CONFIG[act.activityType] ??
                                        DEFAULT_CONFIG;
                                    const Icon = config.icon;

                                    return (
                                        <div
                                            key={act.id}
                                            className="relative flex items-start gap-4 py-2.5 pl-0 group"
                                        >
                                            {/* Icon dot */}
                                            <div className="relative z-10 flex items-center justify-center w-[31px] h-[31px] shrink-0">
                                                <div
                                                    className={`flex items-center justify-center w-[31px] h-[31px] rounded-full border-2 border-background ${config.dotColor}`}
                                                >
                                                    <Icon className="h-3.5 w-3.5 text-white" />
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 -mt-0.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm leading-snug">
                                                            {act.description}
                                                        </p>
                                                        {/* Extra metadata details */}
                                                        {act.activityType ===
                                                            "status_changed" &&
                                                            act.metadata && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs px-1.5 py-0"
                                                                    >
                                                                        {String(
                                                                            act
                                                                                .metadata
                                                                                .from ??
                                                                                ""
                                                                        )}
                                                                    </Badge>
                                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs px-1.5 py-0"
                                                                    >
                                                                        {String(
                                                                            act
                                                                                .metadata
                                                                                .to ??
                                                                                ""
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                                                        {format(
                                                            new Date(
                                                                act.createdAt
                                                            ),
                                                            "h:mm a"
                                                        )}
                                                        {" · "}
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                act.createdAt
                                                            ),
                                                            {
                                                                addSuffix: true,
                                                            }
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ================================================================
                ADD NOTE DIALOG
            ================================================================ */}
            <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Add Note</DialogTitle>
                        <DialogDescription>
                            Add a manual note to this application&apos;s
                            timeline
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Title{" "}
                                <span className="text-muted-foreground font-normal">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                placeholder="Quick note title..."
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Note *
                            </Label>
                            <Textarea
                                placeholder="What happened? Key takeaways, next steps, follow-up items..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                className="mt-1.5 resize-y min-h-[120px]"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {noteContent.length} characters
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setAddNoteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => addNoteMutation.mutate()}
                            disabled={
                                !noteContent.trim() ||
                                addNoteMutation.isPending
                            }
                        >
                            {addNoteMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            )}
                            <MessageSquare className="h-4 w-4 mr-1.5" />
                            Add Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
