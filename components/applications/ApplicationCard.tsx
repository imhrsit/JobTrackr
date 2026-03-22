"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
    GripVertical,
    MoreHorizontal,
    Eye,
    Edit2,
    Trash2,
    MapPin,
    Briefcase,
    MessageSquare,
    Calendar as CalendarIcon,
    Users,
    ArrowRightLeft,
    ExternalLink,
    DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import type { ApplicationCard as ApplicationCardType } from "@/types/application";

// ============================================================================
// Types
// ============================================================================

export interface ApplicationCardProps {
    application: ApplicationCardType;
    /** Whether the card is currently being dragged */
    isDragging?: boolean;
    /** Whether the card is rendered inside the DragOverlay */
    isOverlay?: boolean;
    /** Navigate to details */
    onClick?: () => void;
    /** Open edit form */
    onEdit?: () => void;
    /** Delete this application */
    onDelete?: () => void;
    /** Trigger a status change */
    onStatusChange?: () => void;
    /** Schedule an interview */
    onScheduleInterview?: () => void;
    /** Add a referral */
    onAddReferral?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(company: string): string {
    return company
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatSalary(
    min: number | null,
    max: number | null,
    currency: string
): string | null {
    if (!min && !max) return null;
    const fmt = (n: number) => {
        if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
        return n.toString();
    };
    const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
    if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
    if (min) return `${sym}${fmt(min)}+`;
    if (max) return `Up to ${sym}${fmt(max)}`;
    return null;
}

const WORK_MODE_LABELS: Record<string, string> = {
    REMOTE: "Remote",
    ONSITE: "On-site",
    HYBRID: "Hybrid",
};

// ============================================================================
// Component
// ============================================================================

export const ApplicationCard = React.memo(function ApplicationCard({
    application: app,
    isDragging = false,
    isOverlay = false,
    onClick,
    onEdit,
    onDelete,
    onStatusChange,
    onScheduleInterview,
    onAddReferral,
}: ApplicationCardProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);

    const salary = formatSalary(
        app.job.salaryMin,
        app.job.salaryMax,
        app.job.salaryCurrency
    );
    const interviewCount = app._count?.interviews ?? 0;
    const referralCount = app._count?.referrals ?? 0;

    const appliedAgo = app.appliedDate
        ? formatDistanceToNow(new Date(app.appliedDate), { addSuffix: true })
        : null;

    return (
        <>
            <Card
                className={`
          group relative cursor-grab active:cursor-grabbing
          transition-all duration-200
          ${isDragging ? "opacity-50 scale-[0.98]" : "hover:shadow-md"}
          ${isOverlay ? "shadow-xl rotate-2 scale-105" : ""}
        `}
                onClick={onClick}
                role="button"
                tabIndex={0}
                aria-label={`${app.job.title} at ${app.job.company}`}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick?.();
                    }
                }}
            >
                <CardContent className="p-3 space-y-2">
                    {/* ---- Row 1: Header (logo, title, menu) ---- */}
                    <div className="flex items-start gap-2">
                        {/* Drag handle — decorative, hidden from screen readers */}
                        <div
                            className="mt-1 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors"
                            aria-hidden="true"
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Company logo placeholder — decorative */}
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold"
                            aria-hidden="true"
                        >
                            {getInitials(app.job.company)}
                        </div>

                        {/* Title + company */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate leading-tight">
                                {app.job.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {app.job.company}
                            </p>
                        </div>

                        {/* More menu — visible on hover */}
                        <div
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        aria-label={`Actions for ${app.job.title} at ${app.job.company}`}
                                    >
                                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={onClick} className="gap-2">
                                        <Eye className="h-3.5 w-3.5" />
                                        View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onEdit} className="gap-2">
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Edit job
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onStatusChange} className="gap-2">
                                        <ArrowRightLeft className="h-3.5 w-3.5" />
                                        Change status
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onAddReferral} className="gap-2">
                                        <Users className="h-3.5 w-3.5" />
                                        Add referral
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={onScheduleInterview}
                                        className="gap-2"
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        Schedule interview
                                    </DropdownMenuItem>
                                    {app.job.jobUrl && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild className="gap-2">
                                                <a
                                                    href={app.job.jobUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Open job posting
                                                </a>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => setDeleteOpen(true)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* ---- Row 2: Location + work mode + salary ---- */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {app.job.location && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
                            >
                                <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                                {app.job.location}
                            </Badge>
                        )}
                        {app.job.workMode && WORK_MODE_LABELS[app.job.workMode] && (
                            <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 font-normal"
                            >
                                {WORK_MODE_LABELS[app.job.workMode]}
                            </Badge>
                        )}
                        {salary && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
                            >
                                <DollarSign className="h-2.5 w-2.5" aria-hidden="true" />
                                {salary}
                            </Badge>
                        )}
                    </div>

                    {/* ---- Row 3: Metadata ---- */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2.5">
                            {appliedAgo && (
                                <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" aria-hidden="true" />
                                    <span className="sr-only">Applied </span>
                                    {appliedAgo}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {referralCount > 0 && (
                                <span
                                    className="flex items-center gap-0.5 text-purple-600"
                                    aria-label={`${referralCount} referral${referralCount > 1 ? "s" : ""}`}
                                >
                                    <Users className="h-3 w-3" aria-hidden="true" />
                                    <span aria-hidden="true">{referralCount}</span>
                                </span>
                            )}
                            {interviewCount > 0 && (
                                <span
                                    className="flex items-center gap-0.5 text-orange-600"
                                    aria-label={`${interviewCount} interview${interviewCount > 1 ? "s" : ""}`}
                                >
                                    <Briefcase className="h-3 w-3" aria-hidden="true" />
                                    <span aria-hidden="true">{interviewCount}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ---- Row 4: Action icons on hover / focus ---- */}
                    <div className="flex items-center gap-1 pt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick?.();
                            }}
                            aria-label={`View details for ${app.job.title} at ${app.job.company}`}
                        >
                            <Eye className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.();
                            }}
                            aria-label={`Edit ${app.job.title} at ${app.job.company}`}
                        >
                            <Edit2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteOpen(true);
                            }}
                            aria-label={`Delete ${app.job.title} at ${app.job.company}`}
                        >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ---- Delete confirmation dialog ---- */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the application for{" "}
                            <strong>{app.job.title}</strong> at{" "}
                            <strong>{app.job.company}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                onDelete?.();
                                setDeleteOpen(false);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});
