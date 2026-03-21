"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    format,
    formatDistanceToNow,
    isPast,
    isToday,
    isTomorrow,
    addHours,
} from "date-fns";
import { toast } from "sonner";
import {
    Calendar,
    Plus,
    Clock,
    MapPin,
    User,
    Video,
    Phone,
    Building,
    Code,
    MessageSquare,
    Shield,
    Award,
    Edit,
    Trash2,
    MoreHorizontal,
    Loader2,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    XCircle,
    ExternalLink,
    FileText,
    Star,
    Download,
} from "lucide-react";
import type { InterviewType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export interface Interview {
    id: string;
    applicationId?: string;
    interviewDate: string;
    interviewType: InterviewType;
    interviewerName: string | null;
    location: string | null;
    notes: string | null;
    outcome: string | null;
    completed: boolean;
    createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const INTERVIEW_TYPE_CONFIG: Record<
    InterviewType,
    { label: string; icon: React.ElementType; color: string; bg: string }
> = {
    PHONE: {
        label: "Phone Screen",
        icon: Phone,
        color: "text-blue-700",
        bg: "bg-blue-100",
    },
    VIDEO: {
        label: "Video Interview",
        icon: Video,
        color: "text-purple-700",
        bg: "bg-purple-100",
    },
    ONSITE: {
        label: "Onsite",
        icon: Building,
        color: "text-green-700",
        bg: "bg-green-100",
    },
    TECHNICAL: {
        label: "Technical",
        icon: Code,
        color: "text-orange-700",
        bg: "bg-orange-100",
    },
    BEHAVIORAL: {
        label: "Behavioral",
        icon: MessageSquare,
        color: "text-teal-700",
        bg: "bg-teal-100",
    },
    HR: {
        label: "HR Round",
        icon: Shield,
        color: "text-slate-700",
        bg: "bg-slate-100",
    },
    FINAL: {
        label: "Final Round",
        icon: Award,
        color: "text-amber-700",
        bg: "bg-amber-100",
    },
};

const DURATION_OPTIONS = [
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" },
];

const OUTCOME_OPTIONS = ["Passed", "Failed", "Waiting", "No Response"];

// ============================================================================
// Form Schema
// ============================================================================

const scheduleFormSchema = z.object({
    interviewDate: z.string().min(1, "Date is required"),
    interviewTime: z.string().min(1, "Time is required"),
    interviewType: z.enum([
        "PHONE",
        "VIDEO",
        "ONSITE",
        "TECHNICAL",
        "BEHAVIORAL",
        "HR",
        "FINAL",
    ]),
    interviewerName: z.string().optional(),
    location: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

// ============================================================================
// Main Component
// ============================================================================

export function InterviewsTab({
    applicationId,
    initialInterviews = [],
}: {
    applicationId: string;
    initialInterviews?: Interview[];
}) {
    const queryClient = useQueryClient();
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [editingInterview, setEditingInterview] = useState<Interview | null>(
        null
    );
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [completingInterview, setCompletingInterview] =
        useState<Interview | null>(null);
    const [outcomeValue, setOutcomeValue] = useState("");
    const [outcomeNotes, setOutcomeNotes] = useState("");
    const [outcomeRating, setOutcomeRating] = useState(0);
    const [pastExpanded, setPastExpanded] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const s = new Set(expandedIds);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        setExpandedIds(s);
    };

    // ---- Split upcoming vs past ----
    const { upcoming, past } = useMemo(() => {
        const now = new Date();
        const up: Interview[] = [];
        const pa: Interview[] = [];
        for (const iv of initialInterviews) {
            if (iv.completed || isPast(new Date(iv.interviewDate))) {
                pa.push(iv);
            } else {
                up.push(iv);
            }
        }
        up.sort(
            (a, b) =>
                new Date(a.interviewDate).getTime() -
                new Date(b.interviewDate).getTime()
        );
        pa.sort(
            (a, b) =>
                new Date(b.interviewDate).getTime() -
                new Date(a.interviewDate).getTime()
        );
        return { upcoming: up, past: pa };
    }, [initialInterviews]);

    // ---- Form ----
    const form = useForm<ScheduleFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(scheduleFormSchema) as any,
        defaultValues: {
            interviewDate: "",
            interviewTime: "",
            interviewType: "VIDEO",
            interviewerName: "",
            location: "",
            duration: "60",
            notes: "",
        },
    });

    const openSchedule = () => {
        setEditingInterview(null);
        form.reset({
            interviewDate: "",
            interviewTime: "",
            interviewType: "VIDEO",
            interviewerName: "",
            location: "",
            duration: "60",
            notes: "",
        });
        setScheduleOpen(true);
    };

    const openEdit = (iv: Interview) => {
        setEditingInterview(iv);
        const d = new Date(iv.interviewDate);
        form.reset({
            interviewDate: format(d, "yyyy-MM-dd"),
            interviewTime: format(d, "HH:mm"),
            interviewType: iv.interviewType,
            interviewerName: iv.interviewerName ?? "",
            location: iv.location ?? "",
            duration: "60",
            notes: iv.notes ?? "",
        });
        setScheduleOpen(true);
    };

    const openComplete = (iv: Interview) => {
        setCompletingInterview(iv);
        setOutcomeValue(iv.outcome ?? "");
        setOutcomeNotes(iv.notes ?? "");
        setOutcomeRating(0);
        setCompleteDialogOpen(true);
    };

    // ---- Mutations ----
    const saveMutation = useMutation({
        mutationFn: async (data: ScheduleFormData) => {
            const dateTime = new Date(
                `${data.interviewDate}T${data.interviewTime}`
            ).toISOString();
            const payload = {
                interviewDate: dateTime,
                interviewType: data.interviewType,
                interviewerName: data.interviewerName || null,
                location: data.location || null,
                notes: data.notes || null,
            };

            const isEditing = !!editingInterview;
            const url = isEditing
                ? `/api/interviews/${editingInterview.id}`
                : `/api/applications/${applicationId}/interviews`;
            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to save");
            return res.json();
        },
        onSuccess: () => {
            toast.success(
                editingInterview
                    ? "Interview updated"
                    : "Interview scheduled!"
            );
            setScheduleOpen(false);
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
        },
        onError: () => toast.error("Failed to save interview"),
    });

    const completeMutation = useMutation({
        mutationFn: async () => {
            if (!completingInterview) return;
            const res = await fetch(
                `/api/interviews/${completingInterview.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        completed: true,
                        outcome: outcomeValue || null,
                        notes: outcomeNotes || null,
                    }),
                }
            );
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Interview marked as completed");
            setCompleteDialogOpen(false);
            setCompletingInterview(null);
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
        },
        onError: () => toast.error("Failed to update interview"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/interviews/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Interview cancelled");
            setDeletingId(null);
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
        },
        onError: () => toast.error("Failed to cancel interview"),
    });

    const onSubmit = (data: ScheduleFormData) => saveMutation.mutate(data);

    // ---- ICS export ----
    const generateICS = (iv: Interview) => {
        const start = new Date(iv.interviewDate);
        const end = addHours(start, 1);
        const fmt = (d: Date) =>
            d
                .toISOString()
                .replace(/[-:]/g, "")
                .replace(/\.\d{3}/, "");
        const config = INTERVIEW_TYPE_CONFIG[iv.interviewType];
        const ics = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "BEGIN:VEVENT",
            `DTSTART:${fmt(start)}`,
            `DTEND:${fmt(end)}`,
            `SUMMARY:${config.label} Interview`,
            `DESCRIPTION:${iv.notes ?? ""}`,
            `LOCATION:${iv.location ?? ""}`,
            "END:VEVENT",
            "END:VCALENDAR",
        ].join("\n");

        const blob = new Blob([ics], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interview-${format(start, "yyyy-MM-dd")}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Calendar event downloaded");
    };

    // ---- Helpers ----
    const isUrl = (s: string | null) =>
        s ? /^https?:\/\//i.test(s) : false;

    const getCountdownLabel = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isToday(d)) return "Today";
        if (isTomorrow(d)) return "Tomorrow";
        return formatDistanceToNow(d, { addSuffix: true });
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Interviews</h3>
                    {initialInterviews.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {initialInterviews.length}
                        </Badge>
                    )}
                </div>
                <Button size="sm" onClick={openSchedule}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Schedule Interview
                </Button>
            </div>

            {/* Empty state */}
            {initialInterviews.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No interviews scheduled</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Schedule your first interview to start tracking the
                        process
                    </p>
                    <Button size="sm" onClick={openSchedule}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Schedule Interview
                    </Button>
                </div>
            )}

            {/* ================================================================
                UPCOMING INTERVIEWS
            ================================================================ */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Upcoming ({upcoming.length})
                    </h4>
                    {upcoming.map((iv) => (
                        <InterviewCard
                            key={iv.id}
                            interview={iv}
                            isUpcoming
                            isExpanded={expandedIds.has(iv.id)}
                            onToggle={() => toggleExpand(iv.id)}
                            onEdit={() => openEdit(iv)}
                            onDelete={() => setDeletingId(iv.id)}
                            onComplete={() => openComplete(iv)}
                            onExportICS={() => generateICS(iv)}
                            getCountdownLabel={getCountdownLabel}
                            isUrl={isUrl}
                        />
                    ))}
                </div>
            )}

            {/* ================================================================
                PAST / COMPLETED INTERVIEWS
            ================================================================ */}
            {past.length > 0 && (
                <div className="space-y-3">
                    <button
                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
                        onClick={() => setPastExpanded(!pastExpanded)}
                    >
                        {pastExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        Past Interviews ({past.length})
                    </button>
                    {pastExpanded &&
                        past.map((iv) => (
                            <InterviewCard
                                key={iv.id}
                                interview={iv}
                                isUpcoming={false}
                                isExpanded={expandedIds.has(iv.id)}
                                onToggle={() => toggleExpand(iv.id)}
                                onEdit={() => openEdit(iv)}
                                onDelete={() => setDeletingId(iv.id)}
                                onComplete={() => openComplete(iv)}
                                onExportICS={() => generateICS(iv)}
                                getCountdownLabel={getCountdownLabel}
                                isUrl={isUrl}
                            />
                        ))}
                </div>
            )}

            {/* ================================================================
                SCHEDULE / EDIT DIALOG
            ================================================================ */}
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingInterview
                                ? "Edit Interview"
                                : "Schedule Interview"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingInterview
                                ? "Update interview details"
                                : "Add an upcoming interview for this application"}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="interviewDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="interviewTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="time"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Type & Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="interviewType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Interview Type *
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(
                                                        INTERVIEW_TYPE_CONFIG
                                                    ).map(([key, config]) => (
                                                        <SelectItem
                                                            key={key}
                                                            value={key}
                                                        >
                                                            {config.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duration</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DURATION_OPTIONS.map(
                                                        (d) => (
                                                            <SelectItem
                                                                key={d.value}
                                                                value={d.value}
                                                            >
                                                                {d.label}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Interviewer */}
                            <FormField
                                control={form.control}
                                name="interviewerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Interviewer Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="John Smith"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Location/Link */}
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Location / Meeting Link
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://zoom.us/j/... or 123 Main St"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Notes */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Preparation Notes
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Topics to review, questions to ask..."
                                                className="resize-y"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setScheduleOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                >
                                    {saveMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {editingInterview
                                        ? "Update"
                                        : "Schedule"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ================================================================
                COMPLETE INTERVIEW DIALOG
            ================================================================ */}
            <Dialog
                open={completeDialogOpen}
                onOpenChange={setCompleteDialogOpen}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Record Interview Outcome</DialogTitle>
                        <DialogDescription>
                            How did the interview go? Record your thoughts and
                            the outcome.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Star Rating */}
                        <div>
                            <Label className="text-sm font-medium">
                                How did it go?
                            </Label>
                            <div className="flex gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="transition-transform hover:scale-110"
                                        onClick={() => setOutcomeRating(star)}
                                    >
                                        <Star
                                            className={`h-7 w-7 ${
                                                star <= outcomeRating
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground/30"
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Outcome */}
                        <div>
                            <Label className="text-sm font-medium">
                                Outcome
                            </Label>
                            <Select
                                value={outcomeValue}
                                onValueChange={setOutcomeValue}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select outcome..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {OUTCOME_OPTIONS.map((o) => (
                                        <SelectItem key={o} value={o}>
                                            {o}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label className="text-sm font-medium">
                                Detailed Notes
                            </Label>
                            <Textarea
                                placeholder="Questions asked, how you answered, next steps..."
                                value={outcomeNotes}
                                onChange={(e) =>
                                    setOutcomeNotes(e.target.value)
                                }
                                className="mt-1.5 resize-y min-h-[100px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setCompleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => completeMutation.mutate()}
                            disabled={completeMutation.isPending}
                        >
                            {completeMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            )}
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Mark Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================================================================
                DELETE CONFIRMATION
            ================================================================ */}
            <AlertDialog
                open={!!deletingId}
                onOpenChange={(open) => !open && setDeletingId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Cancel Interview
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this interview? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                deletingId &&
                                deleteMutation.mutate(deletingId)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Cancel Interview
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ============================================================================
// Interview Card Sub-component
// ============================================================================

function InterviewCard({
    interview: iv,
    isUpcoming,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
    onComplete,
    onExportICS,
    getCountdownLabel,
    isUrl,
}: {
    interview: Interview;
    isUpcoming: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onComplete: () => void;
    onExportICS: () => void;
    getCountdownLabel: (d: string) => string;
    isUrl: (s: string | null) => boolean;
}) {
    const config = INTERVIEW_TYPE_CONFIG[iv.interviewType];
    const TypeIcon = config.icon;
    const d = new Date(iv.interviewDate);
    const countdown = getCountdownLabel(iv.interviewDate);
    const isUrlLocation = isUrl(iv.location);

    const outcomeColor =
        iv.outcome === "Passed"
            ? "text-green-700 bg-green-100"
            : iv.outcome === "Failed"
              ? "text-red-700 bg-red-100"
              : iv.outcome === "Waiting"
                ? "text-amber-700 bg-amber-100"
                : "text-slate-700 bg-slate-100";

    return (
        <Card
            className={`overflow-hidden transition-all duration-200 ${
                isUpcoming
                    ? "border-l-4 border-l-blue-500"
                    : "opacity-80"
            }`}
        >
            <CardContent className="p-0">
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                    {/* Left: Date + details */}
                    <div className="flex gap-4 flex-1 min-w-0">
                        {/* Date block */}
                        <div className="flex flex-col items-center justify-center text-center shrink-0 w-14">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                {format(d, "MMM")}
                            </span>
                            <span className="text-2xl font-bold leading-tight">
                                {format(d, "dd")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {format(d, "EEE")}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                    className={`${config.bg} ${config.color} hover:${config.bg} border-0`}
                                >
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {config.label}
                                </Badge>
                                {isUpcoming && (
                                    <span className="text-xs font-medium text-blue-600">
                                        {countdown}
                                    </span>
                                )}
                                {iv.completed && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-green-700 border-0"
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Completed
                                    </Badge>
                                )}
                                {iv.outcome && (
                                    <Badge
                                        variant="secondary"
                                        className={`border-0 ${outcomeColor}`}
                                    >
                                        {iv.outcome}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">
                                    {format(d, "h:mm a")}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {iv.interviewerName && (
                                    <span className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        {iv.interviewerName}
                                    </span>
                                )}
                                {iv.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {isUrlLocation ? (
                                            <a
                                                href={iv.location}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline truncate max-w-[200px]"
                                            >
                                                Join Meeting
                                            </a>
                                        ) : (
                                            <span className="truncate max-w-[200px]">
                                                {iv.location}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        {isUpcoming && isUrlLocation && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                asChild
                            >
                                <a
                                    href={iv.location!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Join
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={onToggle}
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                    Hide
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                    Details
                                </>
                            )}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                {!iv.completed && (
                                    <DropdownMenuItem onClick={onComplete}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Mark Complete
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={onExportICS}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Add to Calendar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel Interview
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Prep checklist for upcoming */}
                        {isUpcoming && (
                            <div>
                                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                    Preparation Checklist
                                </h5>
                                <div className="space-y-1.5">
                                    {[
                                        "Review job description",
                                        "Research company",
                                        "Prepare questions to ask",
                                        ...(iv.interviewType === "VIDEO"
                                            ? ["Test camera & microphone"]
                                            : []),
                                        ...(iv.interviewType === "TECHNICAL"
                                            ? [
                                                  "Review data structures & algorithms",
                                                  "Practice coding problems",
                                              ]
                                            : []),
                                    ].map((item, i) => (
                                        <label
                                            key={i}
                                            className="flex items-center gap-2 text-sm cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded border-muted-foreground/30"
                                            />
                                            {item}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {iv.notes && (
                            <div>
                                <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground mb-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    Notes
                                </h5>
                                <p className="text-sm whitespace-pre-wrap">
                                    {iv.notes}
                                </p>
                            </div>
                        )}

                        {!iv.notes && !isUpcoming && (
                            <p className="text-sm text-muted-foreground italic">
                                No notes recorded for this interview.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
