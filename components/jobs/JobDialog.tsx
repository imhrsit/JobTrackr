"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/lib/toast";
import {
    Briefcase,
    Building,
    Link as LinkIcon,
    MapPin,
    DollarSign,
    CalendarDays,
    FileText,
    Loader2,
    X,
    Plus,
    Check,
    ChevronsUpDown,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================================================
// Types
// ============================================================================

export interface JobDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface SkillEntry {
    id?: string;
    name: string;
    isRequired: boolean;
}

interface SkillOption {
    id: string;
    name: string;
}

// ============================================================================
// Validation Schema
// ============================================================================

const jobFormSchema = z.object({
    title: z
        .string()
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title must be 100 characters or less"),
    company: z
        .string()
        .min(2, "Company must be at least 2 characters")
        .max(100, "Company must be 100 characters or less"),
    jobUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    location: z.string().max(200).optional().or(z.literal("")),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
    salaryCurrency: z.string().default("USD"),
    salaryMin: z.coerce.number().int().positive().optional(),
    salaryMax: z.coerce.number().int().positive().optional(),
    description: z.string().optional().or(z.literal("")),
    requirements: z.string().optional().or(z.literal("")),
    postedDate: z.date().optional().nullable(),
    status: z.enum([
        "SAVED",
        "APPLIED",
        "REFERRED",
        "INTERVIEWING",
        "OFFERED",
        "REJECTED",
    ]),
    appliedDate: z.date().optional().nullable(),
    resumeVersion: z.string().optional().or(z.literal("")),
    coverLetter: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    hasCoverLetter: z.boolean().default(false),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

const DRAFT_KEY = "jobtrackr_job_draft";

const CURRENCIES = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "INR", label: "INR (₹)" },
    { value: "CAD", label: "CAD (C$)" },
    { value: "AUD", label: "AUD (A$)" },
];

const STATUS_OPTIONS = [
    { value: "SAVED", label: "Saved" },
    { value: "APPLIED", label: "Applied" },
    { value: "REFERRED", label: "Referred" },
    { value: "INTERVIEWING", label: "Interviewing" },
    { value: "OFFERED", label: "Offered" },
    { value: "REJECTED", label: "Rejected" },
] as const;

// ============================================================================
// Component
// ============================================================================

export function JobDialog({ open, onClose, onSuccess }: JobDialogProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [skills, setSkills] = useState<SkillEntry[]>([]);
    const [skillSearch, setSkillSearch] = useState("");
    const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
    const [skillsOpen, setSkillsOpen] = useState(false);
    const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const form = useForm<JobFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(jobFormSchema) as any,
        defaultValues: {
            title: "",
            company: "",
            jobUrl: "",
            location: "",
            workMode: "REMOTE",
            salaryCurrency: "USD",
            salaryMin: undefined,
            salaryMax: undefined,
            description: "",
            requirements: "",
            postedDate: null,
            status: "SAVED",
            appliedDate: null,
            resumeVersion: "",
            coverLetter: "",
            notes: "",
            hasCoverLetter: false,
        },
    });

    const watchStatus = form.watch("status");
    const watchHasCoverLetter = form.watch("hasCoverLetter");

    // ---- Draft auto-save (every 30s) ----
    useEffect(() => {
        if (!open) return;

        draftTimerRef.current = setInterval(() => {
            const values = form.getValues();
            try {
                localStorage.setItem(
                    DRAFT_KEY,
                    JSON.stringify({
                        ...values,
                        postedDate: values.postedDate?.toISOString() ?? null,
                        appliedDate: values.appliedDate?.toISOString() ?? null,
                        skills,
                    })
                );
            } catch {
                // localStorage full or unavailable — ignore
            }
        }, 30_000);

        return () => {
            if (draftTimerRef.current) clearInterval(draftTimerRef.current);
        };
    }, [open, form, skills]);

    // ---- Restore draft on open ----
    useEffect(() => {
        if (!open) return;

        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);

            form.reset({
                ...draft,
                postedDate: draft.postedDate ? new Date(draft.postedDate) : null,
                appliedDate: draft.appliedDate ? new Date(draft.appliedDate) : null,
                salaryMin: draft.salaryMin ?? undefined,
                salaryMax: draft.salaryMax ?? undefined,
            });

            if (draft.skills) setSkills(draft.skills);
        } catch {
            // corrupt draft — ignore
        }
        // Only run on open change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // ---- Skills search ----
    const fetchSkills = useCallback(async (search: string) => {
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            const res = await fetch(`/api/skills?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSkillOptions(data.skills);
            }
        } catch {
            // network error — silently ignore
        }
    }, []);

    useEffect(() => {
        if (skillsOpen) fetchSkills(skillSearch);
    }, [skillSearch, skillsOpen, fetchSkills]);

    const addSkill = (skill: SkillOption | { name: string }) => {
        const exists = skills.some(
            (s) => s.name.toLowerCase() === skill.name.toLowerCase()
        );
        if (exists) return;

        setSkills((prev) => [
            ...prev,
            {
                id: "id" in skill ? skill.id : undefined,
                name: skill.name,
                isRequired: true,
            },
        ]);
        setSkillSearch("");
        setSkillsOpen(false);
    };

    const removeSkill = (name: string) => {
        setSkills((prev) => prev.filter((s) => s.name !== name));
    };

    const toggleSkillRequired = (name: string) => {
        setSkills((prev) =>
            prev.map((s) =>
                s.name === name ? { ...s, isRequired: !s.isRequired } : s
            )
        );
    };

    // ---- Clear draft ----
    const clearDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch {
            // ignore
        }
    };

    // ---- Close with unsaved changes warning ----
    const handleClose = () => {
        if (form.formState.isDirty) {
            // Save as draft before closing
            const values = form.getValues();
            try {
                localStorage.setItem(
                    DRAFT_KEY,
                    JSON.stringify({
                        ...values,
                        postedDate: values.postedDate?.toISOString() ?? null,
                        appliedDate: values.appliedDate?.toISOString() ?? null,
                        skills,
                    })
                );
                toast.info("Draft saved. Your progress will be restored next time.");
            } catch {
                // ignore
            }
        }
        onClose();
    };

    // ---- Submit ----
    const onSubmit = async (values: JobFormValues) => {
        // Cross-field validation: max >= min salary
        if (values.salaryMin && values.salaryMax && values.salaryMax < values.salaryMin) {
            form.setError("salaryMax", { message: "Max salary must be ≥ min salary" });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                title: values.title,
                company: values.company,
                jobUrl: values.jobUrl || "",
                location: values.location || "",
                workMode: values.workMode,
                salaryCurrency: values.salaryCurrency,
                salaryMin: values.salaryMin ?? null,
                salaryMax: values.salaryMax ?? null,
                description: values.description || "",
                requirements: values.requirements || "",
                postedDate: values.postedDate?.toISOString() ?? null,
                status: values.status,
                appliedDate: values.appliedDate?.toISOString() ?? null,
                resumeVersion: values.resumeVersion || "",
                coverLetter: values.hasCoverLetter ? values.coverLetter || "" : "",
                notes: values.notes || "",
                skills,
            };

            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || "Failed to create job");
            }

            clearDraft();
            form.reset();
            setSkills([]);

            queryClient.invalidateQueries({ queryKey: ["applications"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["jobs"] });

            toast.success(`Added ${values.title} at ${values.company}`);
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Something went wrong"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                {/* ---- Header ---- */}
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Add New Job
                    </DialogTitle>
                </DialogHeader>

                {/* ---- Scrollable Form ---- */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <Form {...form}>
                        <form
                            id="job-form"
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            {/* ======== Section: Basic Info ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Basic Information
                                </h3>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Title */}
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Job Title <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Software Engineer"
                                                            className="pl-9"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Company */}
                                    <FormField
                                        control={form.control}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Company <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Google"
                                                            className="pl-9"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Job URL */}
                                <FormField
                                    control={form.control}
                                    name="jobUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Job URL</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="https://careers.example.com/..."
                                                        className="pl-9"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* ======== Section: Location & Work ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Location & Work Mode
                                </h3>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Location */}
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Location</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="San Francisco, CA"
                                                            className="pl-9"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Work Mode */}
                                    <FormField
                                        control={form.control}
                                        name="workMode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Work Mode <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select work mode" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="REMOTE">🏠 Remote</SelectItem>
                                                        <SelectItem value="HYBRID">🔄 Hybrid</SelectItem>
                                                        <SelectItem value="ONSITE">🏢 On-site</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* ======== Section: Compensation ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Compensation
                                </h3>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    {/* Currency */}
                                    <FormField
                                        control={form.control}
                                        name="salaryCurrency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
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
                                                        {CURRENCIES.map((c) => (
                                                            <SelectItem key={c.value} value={c.value}>
                                                                {c.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Min Salary */}
                                    <FormField
                                        control={form.control}
                                        name="salaryMin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Min Salary</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="number"
                                                            placeholder="80000"
                                                            className="pl-9"
                                                            {...field}
                                                            value={field.value ?? ""}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    e.target.value === ""
                                                                        ? undefined
                                                                        : Number(e.target.value)
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Max Salary */}
                                    <FormField
                                        control={form.control}
                                        name="salaryMax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Salary</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="number"
                                                            placeholder="120000"
                                                            className="pl-9"
                                                            {...field}
                                                            value={field.value ?? ""}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    e.target.value === ""
                                                                        ? undefined
                                                                        : Number(e.target.value)
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* ======== Section: Job Details ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Job Details
                                </h3>

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Job description..."
                                                    rows={4}
                                                    className="resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Requirements */}
                                <FormField
                                    control={form.control}
                                    name="requirements"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Requirements</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Job requirements..."
                                                    rows={3}
                                                    className="resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Posted Date */}
                                <FormField
                                    control={form.control}
                                    name="postedDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Posted Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={`w-[240px] pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""
                                                                }`}
                                                        >
                                                            {field.value
                                                                ? format(field.value, "PPP")
                                                                : "Pick a date"}
                                                            <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value ?? undefined}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date > new Date()}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* ======== Section: Skills ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Skills
                                </h3>

                                {/* Skills chips */}
                                {skills.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map((skill) => (
                                            <Badge
                                                key={skill.name}
                                                variant={skill.isRequired ? "default" : "secondary"}
                                                className="gap-1 cursor-pointer"
                                            >
                                                <span onClick={() => toggleSkillRequired(skill.name)}>
                                                    {skill.name}
                                                    {skill.isRequired && (
                                                        <span className="text-[10px] ml-0.5">*</span>
                                                    )}
                                                </span>
                                                <X
                                                    className="h-3 w-3 ml-1 hover:text-destructive"
                                                    onClick={() => removeSkill(skill.name)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Skills search combobox */}
                                <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={skillsOpen}
                                            className="w-full justify-between font-normal text-muted-foreground"
                                        >
                                            Add skills...
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <div className="p-2">
                                            <Input
                                                placeholder="Search skills..."
                                                value={skillSearch}
                                                onChange={(e) => setSkillSearch(e.target.value)}
                                                className="h-8"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto px-1 pb-1">
                                            {skillOptions
                                                .filter(
                                                    (opt) =>
                                                        !skills.some(
                                                            (s) =>
                                                                s.name.toLowerCase() ===
                                                                opt.name.toLowerCase()
                                                        )
                                                )
                                                .map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                                        onClick={() => addSkill(opt)}
                                                    >
                                                        <Check className="h-3.5 w-3.5 opacity-0" />
                                                        {opt.name}
                                                    </button>
                                                ))}
                                            {skillSearch &&
                                                !skillOptions.some(
                                                    (o) =>
                                                        o.name.toLowerCase() ===
                                                        skillSearch.toLowerCase()
                                                ) &&
                                                !skills.some(
                                                    (s) =>
                                                        s.name.toLowerCase() ===
                                                        skillSearch.toLowerCase()
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-primary"
                                                        onClick={() => addSkill({ name: skillSearch })}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Create &quot;{skillSearch}&quot;
                                                    </button>
                                                )}
                                            {!skillSearch && skillOptions.length === 0 && (
                                                <p className="px-2 py-3 text-xs text-center text-muted-foreground">
                                                    Type to search or create skills
                                                </p>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <p className="text-xs text-muted-foreground">
                                    Click a skill tag to toggle required/optional. Required skills
                                    are shown in blue.
                                </p>
                            </div>

                            <Separator />

                            {/* ======== Section: Application Details ======== */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Application Details
                                </h3>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Status */}
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Status <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {STATUS_OPTIONS.map((s) => (
                                                            <SelectItem key={s.value} value={s.value}>
                                                                {s.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Applied Date */}
                                    {watchStatus !== "SAVED" && (
                                        <FormField
                                            control={form.control}
                                            name="appliedDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Applied Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={`w-full pl-3 text-left font-normal ${!field.value
                                                                        ? "text-muted-foreground"
                                                                        : ""
                                                                        }`}
                                                                >
                                                                    {field.value
                                                                        ? format(field.value, "PPP")
                                                                        : "Pick a date"}
                                                                    <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            className="w-auto p-0"
                                                            align="start"
                                                        >
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ?? undefined}
                                                                onSelect={field.onChange}
                                                                disabled={(date) => date > new Date()}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>

                                {/* Resume Version */}
                                <FormField
                                    control={form.control}
                                    name="resumeVersion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Resume Version</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="e.g., v2-frontend"
                                                        className="pl-9"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Cover Letter toggle + textarea */}
                                <FormField
                                    control={form.control}
                                    name="hasCoverLetter"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">
                                                    Cover Letter
                                                </FormLabel>
                                                <p className="text-xs text-muted-foreground">
                                                    Include a cover letter with this application
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {watchHasCoverLetter && (
                                    <FormField
                                        control={form.control}
                                        name="coverLetter"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Dear Hiring Manager..."
                                                        rows={5}
                                                        className="resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Notes */}
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Any additional notes..."
                                                    rows={3}
                                                    className="resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </form>
                    </Form>
                </div>

                {/* ---- Sticky Footer ---- */}
                <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-2">
                    {form.formState.isDirty && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                form.reset();
                                setSkills([]);
                                clearDraft();
                            }}
                            className="mr-auto text-muted-foreground"
                        >
                            Reset
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="job-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Job
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
