"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Schema
// ============================================================================

const editSchema = z.object({
    title: z.string().min(2, "Required").max(100),
    company: z.string().min(2, "Required").max(100),
    location: z.string().max(200).optional().or(z.literal("")),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
    jobUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    salaryCurrency: z.string(),
    salaryMin: z.coerce.number().int().positive().nullable().optional(),
    salaryMax: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().optional().or(z.literal("")),
    requirements: z.string().optional().or(z.literal("")),
    status: z.enum(["SAVED", "APPLIED", "REFERRED", "INTERVIEWING", "OFFERED", "REJECTED"]),
    appliedDate: z.string().optional().or(z.literal("")),
    resumeVersion: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
});

type EditFormValues = z.infer<typeof editSchema>;

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

// ============================================================================
// Props
// ============================================================================

export interface EditApplicationDialogProps {
    applicationId: string | null;
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function EditApplicationDialog({
    applicationId,
    open,
    onClose,
    onSuccess,
}: EditApplicationDialogProps) {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<{ application: { id: string; status: string; appliedDate: string | null; resumeVersion: string | null; notes: string | null; job: { title: string; company: string; location: string | null; workMode: string; jobUrl: string | null; salaryCurrency: string; salaryMin: number | null; salaryMax: number | null; description: string | null; requirements: string | null } } }>({
        queryKey: ["application-detail", applicationId],
        queryFn: async () => {
            const res = await fetch(`/api/applications/${applicationId}`);
            if (!res.ok) throw new Error("Failed to load");
            return res.json();
        },
        enabled: open && !!applicationId,
    });

    const application = data?.application;
    const [saving, setSaving] = useState(false);

    const form = useForm<EditFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(editSchema) as any,
        defaultValues: {
            title: "",
            company: "",
            location: "",
            workMode: "ONSITE",
            jobUrl: "",
            salaryCurrency: "INR",
            salaryMin: undefined,
            salaryMax: undefined,
            description: "",
            requirements: "",
            status: "SAVED",
            appliedDate: "",
            resumeVersion: "",
            notes: "",
        },
    });

    // Sync form when application data loads
    useEffect(() => {
        if (open && application) {
            form.reset({
                title: application.job.title,
                company: application.job.company,
                location: application.job.location ?? "",
                workMode: application.job.workMode as "REMOTE" | "HYBRID" | "ONSITE",
                jobUrl: application.job.jobUrl ?? "",
                salaryCurrency: application.job.salaryCurrency ?? "INR",
                salaryMin: application.job.salaryMin ?? undefined,
                salaryMax: application.job.salaryMax ?? undefined,
                description: application.job.description ?? "",
                requirements: application.job.requirements ?? "",
                status: application.status as EditFormValues["status"],
                appliedDate: application.appliedDate
                    ? format(new Date(application.appliedDate), "yyyy-MM-dd")
                    : "",
                resumeVersion: application.resumeVersion ?? "",
                notes: application.notes ?? "",
            });
        }
    }, [open, application, form]);

    const onSubmit = async (values: EditFormValues) => {
        if (!application) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/applications/${application.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: values.status,
                    appliedDate: values.appliedDate
                        ? new Date(values.appliedDate).toISOString()
                        : null,
                    resumeVersion: values.resumeVersion || null,
                    notes: values.notes || null,
                    job: {
                        title: values.title,
                        company: values.company,
                        location: values.location || null,
                        workMode: values.workMode,
                        jobUrl: values.jobUrl || null,
                        salaryCurrency: values.salaryCurrency,
                        salaryMin: values.salaryMin ?? null,
                        salaryMax: values.salaryMax ?? null,
                        description: values.description || null,
                        requirements: values.requirements || null,
                    },
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Failed to save");
            }
            toast.success("Application updated");
            queryClient.invalidateQueries({ queryKey: ["application-detail", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["applications"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Edit Application</DialogTitle>
                </DialogHeader>

                {isLoading || !application ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 -mx-6 px-6 overflow-y-auto">
                            <Form {...form}>
                                <form id="edit-app-form-shared" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">

                                    {/* ── Job Info ── */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Info</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="title" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Job Title</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="company" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="location" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g. San Francisco, CA" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="workMode" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Work Mode</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="REMOTE">🏠 Remote</SelectItem>
                                                            <SelectItem value="HYBRID">🔄 Hybrid</SelectItem>
                                                            <SelectItem value="ONSITE">🏢 On-site</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="jobUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Job URL</FormLabel>
                                                <FormControl><Input {...field} type="url" placeholder="https://..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <Separator />

                                    {/* ── Salary ── */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salary</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <FormField control={form.control} name="salaryCurrency" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Currency</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {CURRENCIES.map((c) => (
                                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="salaryMin" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Min</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 80000"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="salaryMax" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Max</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 120000"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* ── Application ── */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Application</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="status" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="SAVED">Saved</SelectItem>
                                                            <SelectItem value="APPLIED">Applied</SelectItem>
                                                            <SelectItem value="REFERRED">Referred</SelectItem>
                                                            <SelectItem value="INTERVIEWING">Interviewing</SelectItem>
                                                            <SelectItem value="OFFERED">Offered</SelectItem>
                                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="appliedDate" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Applied Date</FormLabel>
                                                    <FormControl><Input type="date" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="resumeVersion" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Resume Version</FormLabel>
                                                <FormControl><Input {...field} placeholder="e.g. v2, Google-SWE" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <Separator />

                                    {/* ── Details ── */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</p>
                                        <FormField control={form.control} name="description" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Job Description</FormLabel>
                                                <FormControl><Textarea {...field} rows={4} placeholder="Paste the job description..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="requirements" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Requirements</FormLabel>
                                                <FormControl><Textarea {...field} rows={3} placeholder="Key requirements..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl><Textarea {...field} rows={3} placeholder="Your personal notes..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                </form>
                            </Form>
                        </div>

                        <DialogFooter className="pt-4 border-t shrink-0">
                            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                            <Button type="submit" form="edit-app-form-shared" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
