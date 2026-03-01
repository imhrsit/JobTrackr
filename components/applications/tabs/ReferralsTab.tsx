"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import {
    Users,
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    Info,
    Calendar,
    Briefcase,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Loader2,
    Clock,
    RefreshCw,
    FileText
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReferralStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
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

// ----------------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------------

export interface Referral {
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

const REFERRAL_STATUS_COLORS: Record<ReferralStatus, { bg: string, text: string }> = {
    NOT_ASKED: { bg: "bg-slate-100", text: "text-slate-700" },
    ASKED: { bg: "bg-blue-100", text: "text-blue-700" },
    PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
    RECEIVED: { bg: "bg-green-100", text: "text-green-700" },
    DECLINED: { bg: "bg-red-100", text: "text-red-700" },
};

const RELATIONSHIPS = [
    "Colleague",
    "Former Colleague",
    "Friend",
    "LinkedIn Connection",
    "Recruiter",
    "Alumni",
    "Other"
];

const formSchema = z.object({
    contactName: z.string().min(1, "Name is required"),
    relationship: z.string().optional(),
    company: z.string().optional(),
    status: z.enum(["NOT_ASKED", "ASKED", "PENDING", "RECEIVED", "DECLINED"]),
    dateAsked: z.string().optional(),
    followUpDate: z.string().optional(),
    notes: z.string().optional(),
    response: z.string().optional(),
}).superRefine((data, ctx) => {
    // If status is ASKED or PENDING, dateAsked is recommended/required
    if ((data.status === "ASKED" || data.status === "PENDING") && !data.dateAsked) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Date asked should be provided for this status",
            path: ["dateAsked"],
        });
    }

    // If follow up date is provided, it should generally be in the future (warn only, no hard block)
    if (data.followUpDate) {
        const followUp = new Date(data.followUpDate);
        followUp.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (followUp < today) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Follow-up date should ideally be in the future",
                path: ["followUpDate"],
            });
        }
    }
});

type FormData = z.infer<typeof formSchema>;

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

export function ReferralsTab({
    applicationId,
    initialReferrals = [],
}: {
    applicationId: string;
    initialReferrals?: Referral[];
}) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    const form = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            contactName: "",
            relationship: "",
            company: "",
            status: "NOT_ASKED",
            dateAsked: "",
            followUpDate: "",
            notes: "",
            response: "",
        },
    });

    const openCreate = () => {
        setEditingReferral(null);
        form.reset({
            contactName: "",
            relationship: "",
            company: "",
            status: "NOT_ASKED",
            dateAsked: "",
            followUpDate: "",
            notes: "",
            response: "",
        });
        setIsDialogOpen(true);
    };

    const openEdit = (ref: Referral) => {
        setEditingReferral(ref);
        form.reset({
            contactName: ref.contactName,
            relationship: ref.relationship || "",
            company: ref.company || "",
            status: ref.status,
            dateAsked: ref.dateAsked ? new Date(ref.dateAsked).toISOString().split('T')[0] : "",
            followUpDate: ref.followUpDate ? new Date(ref.followUpDate).toISOString().split('T')[0] : "",
            notes: ref.notes || "",
            response: ref.response || "",
        });
        setIsDialogOpen(true);
    };

    const saveMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const isEditing = !!editingReferral;
            const url = isEditing
                ? `/api/referrals/${editingReferral.id}`
                : `/api/applications/${applicationId}/referrals`;
            const method = isEditing ? "PATCH" : "POST";

            const payload = {
                ...data,
                dateAsked: data.dateAsked || null,
                followUpDate: data.followUpDate || null,
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to save referral");
            return res.json();
        },
        onSuccess: () => {
            toast.success(editingReferral ? "Referral updated" : "Referral added");
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["application-detail", applicationId] });
        },
        onError: () => toast.error("Failed to save referral"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            toast.success("Referral deleted");
            setDeletingId(null);
            queryClient.invalidateQueries({ queryKey: ["application-detail", applicationId] });
        },
        onError: () => toast.error("Failed to delete referral"),
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: ReferralStatus }) => {
            const res = await fetch(`/api/referrals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Status updated");
            queryClient.invalidateQueries({ queryKey: ["application-detail", applicationId] });
        },
        onError: () => toast.error("Failed to update status"),
    });

    const onSubmit = (data: FormData) => saveMutation.mutate(data);

    // ------------------------------------------------------------------------
    // Renders
    // ------------------------------------------------------------------------

    const renderEmpty = () => (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No referrals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Track your referral requests to stay organized
            </p>
            <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Referral
            </Button>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Referral Requests</h3>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="w-64 text-xs leading-relaxed">
                                    Track internal advocates at the company. Referrals drastically improve your chances of getting an interview. Keep track of whom you asked and when to follow up.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                {initialReferrals.length > 0 && (
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Referral
                    </Button>
                )}
            </div>

            {initialReferrals.length === 0 ? renderEmpty() : (
                <div className="space-y-3">
                    {initialReferrals.map((ref) => {
                        const style = REFERRAL_STATUS_COLORS[ref.status];
                        const isExpanded = expandedIds.has(ref.id);

                        let followUpCountdown = null;
                        if (ref.followUpDate && (ref.status === "ASKED" || ref.status === "PENDING")) {
                            const days = differenceInDays(new Date(ref.followUpDate), new Date());
                            if (days < 0) followUpCountdown = <span className="text-red-600 font-medium">Overdue!</span>;
                            else if (days === 0) followUpCountdown = <span className="text-amber-600 font-medium">Today</span>;
                            else followUpCountdown = `in ${days} days`;
                        }

                        return (
                            <Card key={ref.id} className="overflow-hidden transition-all duration-200">
                                <CardContent className="p-0">
                                    <div className="p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-lg truncate">{ref.contactName}</h4>
                                                <Badge className={`${style.bg} ${style.text} hover:${style.bg} border-0`}>
                                                    {ref.status.replace("_", " ")}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                                                {ref.relationship && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {ref.relationship}
                                                    </span>
                                                )}
                                                {ref.company && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Briefcase className="h-3.5 w-3.5" />
                                                        {ref.company}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 text-xs mt-3">
                                                {ref.dateAsked && (
                                                    <span className="flex items-center gap-1.5 text-slate-600">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Asked on {format(new Date(ref.dateAsked), "MMM d, yyyy")}
                                                    </span>
                                                )}
                                                {ref.followUpDate && (
                                                    <span className="flex items-center gap-1.5 text-slate-600">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Follow up: {format(new Date(ref.followUpDate), "MMM d")}
                                                        {followUpCountdown && ` (${followUpCountdown})`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full sm:w-auto"
                                                onClick={() => toggleExpand(ref.id)}
                                            >
                                                {isExpanded ? (
                                                    <><ChevronUp className="h-4 w-4 mr-1.5" /> Hide Details</>
                                                ) : (
                                                    <><ChevronDown className="h-4 w-4 mr-1.5" /> View Details</>
                                                )}
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="shrink-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => openEdit(ref)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit Referral
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <RefreshCw className="h-4 w-4 mr-2" />
                                                            Change Status
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {Object.keys(REFERRAL_STATUS_COLORS).map((status) => (
                                                                <DropdownMenuItem
                                                                    key={status}
                                                                    disabled={status === ref.status}
                                                                    onClick={() => statusMutation.mutate({ id: ref.id, status: status as ReferralStatus })}
                                                                >
                                                                    {status.replace("_", " ")}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setDeletingId(ref.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Expanded Details Area */}
                                    {isExpanded && (
                                        <div className="border-t bg-muted/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            {ref.notes && (
                                                <div>
                                                    <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground mb-1">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        Notes
                                                    </h5>
                                                    <p className="text-sm whitespace-pre-wrap">{ref.notes}</p>
                                                </div>
                                            )}
                                            {ref.response && (
                                                <div>
                                                    <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground mb-1">
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        Response
                                                    </h5>
                                                    <p className="text-sm whitespace-pre-wrap italic">"{ref.response}"</p>
                                                </div>
                                            )}
                                            {!ref.notes && !ref.response && (
                                                <p className="text-sm text-muted-foreground italic">No additional notes or responses recorded.</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialog for Create/Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingReferral ? "Edit Referral" : "Add Referral"}</DialogTitle>
                        <DialogDescription>
                            Track an internal company connection who might refer you.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="contactName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contact Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="company"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Company Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="relationship"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Relationship</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select relationship..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {RELATIONSHIPS.map((r) => (
                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.keys(REFERRAL_STATUS_COLORS).map((r) => (
                                                        <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dateAsked"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date Asked</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="followUpDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Follow-up Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Background details, how you know them..." className="resize-y" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="response"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Response</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="What did they reply?" className="resize-y" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saveMutation.isPending}>
                                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingReferral ? "Update" : "Add"} Referral
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Referral</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this referral record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
