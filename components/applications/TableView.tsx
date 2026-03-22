"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
    Eye,
    Edit2,
    Trash2,
    MoreHorizontal,
    ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/lib/toast";
import { STATUS_CONFIG } from "@/components/applications/KanbanColumn";
import type {
    ApplicationCard as ApplicationCardData,
    ApplicationsResponse,
} from "@/types/application";

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
    const fmt = (n: number) =>
        n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString();
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
// Types
// ============================================================================

export interface TableViewProps {
    applications: ApplicationCardData[];
    queryKey: unknown[];
    onEdit: (id: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function TableView({ applications, queryKey, onEdit }: TableViewProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<ApplicationCardData | null>(null);

    const deleteApp = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey });
            const prev = queryClient.getQueryData<ApplicationsResponse>(queryKey);
            if (prev) {
                queryClient.setQueryData<ApplicationsResponse>(queryKey, {
                    ...prev,
                    applications: prev.applications.filter((a) => a.id !== id),
                    total: prev.total - 1,
                });
            }
            return { prev };
        },
        onError: (_err, _id, context) => {
            if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
            toast.error("Failed to delete application.");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
        },
    });

    return (
        <>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                Role
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                                Location
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                                Work Mode
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                                Salary
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                                Applied
                            </th>
                            <th className="px-4 py-3 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {applications.map((app) => {
                            const config = STATUS_CONFIG[app.status];
                            const StatusIcon = config.icon;
                            const salary = formatSalary(
                                app.job.salaryMin,
                                app.job.salaryMax,
                                app.job.salaryCurrency
                            );
                            const appliedAgo = app.appliedDate
                                ? formatDistanceToNow(new Date(app.appliedDate), {
                                      addSuffix: true,
                                  })
                                : "—";

                            return (
                                <tr
                                    key={app.id}
                                    className="hover:bg-muted/40 transition-colors group"
                                >
                                    {/* Role + Company */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold"
                                                aria-hidden="true"
                                            >
                                                {getInitials(app.job.company)}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    className="font-medium truncate cursor-pointer hover:underline"
                                                    onClick={() =>
                                                        router.push(`/jobs/${app.id}`)
                                                    }
                                                >
                                                    {app.job.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {app.job.company}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}
                                        >
                                            <StatusIcon
                                                className="h-3 w-3"
                                                aria-hidden="true"
                                            />
                                            {config.label}
                                        </span>
                                    </td>

                                    {/* Location */}
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                        {app.job.location ?? "—"}
                                    </td>

                                    {/* Work Mode */}
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {app.job.workMode &&
                                        WORK_MODE_LABELS[app.job.workMode] ? (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-normal"
                                            >
                                                {WORK_MODE_LABELS[app.job.workMode]}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>

                                    {/* Salary */}
                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                                        {salary ?? "—"}
                                    </td>

                                    {/* Applied */}
                                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                                        {appliedAgo}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        aria-label={`Actions for ${app.job.title}`}
                                                    >
                                                        <MoreHorizontal
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-44"
                                                >
                                                    <DropdownMenuItem
                                                        className="gap-2"
                                                        onClick={() =>
                                                            router.push(`/jobs/${app.id}`)
                                                        }
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2"
                                                        onClick={() => onEdit(app.id)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {app.job.jobUrl && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                asChild
                                                                className="gap-2"
                                                            >
                                                                <a
                                                                    href={app.job.jobUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    Open posting
                                                                </a>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="gap-2 text-destructive focus:text-destructive"
                                                        onClick={() => setDeleteTarget(app)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the application for{" "}
                            <strong>{deleteTarget?.job.title}</strong> at{" "}
                            <strong>{deleteTarget?.job.company}</strong>. This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteTarget) {
                                    deleteApp.mutate(deleteTarget.id);
                                    setDeleteTarget(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
