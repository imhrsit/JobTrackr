"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Bookmark,
    Send,
    Users,
    Video,
    CheckCircle,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface KanbanColumnProps {
    status: ApplicationStatus;
    /** Rendered card elements keyed by ID */
    children: React.ReactNode;
    /** List of card IDs for SortableContext */
    cardIds: string[];
    /** Override the count shown in the header badge */
    count?: number;
}

export interface KanbanSortableItemProps {
    id: string;
    children: React.ReactNode;
}

// ============================================================================
// Status Config
// ============================================================================

interface StatusConfig {
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    emptyMessage: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, StatusConfig> = {
    SAVED: {
        label: "Saved",
        icon: Bookmark,
        color: "text-slate-700",
        bgColor: "bg-slate-100",
        borderColor: "border-slate-300",
        emptyMessage: "Bookmark jobs you're interested in",
    },
    APPLIED: {
        label: "Applied",
        icon: Send,
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300",
        emptyMessage: "Jobs you've applied to will show here",
    },
    REFERRED: {
        label: "Referred",
        icon: Users,
        color: "text-purple-700",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300",
        emptyMessage: "Referral-backed applications appear here",
    },
    INTERVIEWING: {
        label: "Interviewing",
        icon: Video,
        color: "text-orange-700",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-300",
        emptyMessage: "Active interviews will show here",
    },
    OFFERED: {
        label: "Offered",
        icon: CheckCircle,
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-300",
        emptyMessage: "Offers you receive will appear here",
    },
    REJECTED: {
        label: "Rejected",
        icon: XCircle,
        color: "text-red-700",
        bgColor: "bg-red-100",
        borderColor: "border-red-300",
        emptyMessage: "Rejected applications are tracked here",
    },
};

export { STATUS_CONFIG };

// ============================================================================
// Kanban Column
// ============================================================================

export const KanbanColumn = React.memo(function KanbanColumn({
    status,
    children,
    cardIds,
    count,
}: KanbanColumnProps) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const displayCount = count ?? cardIds.length;

    return (
        <div
            ref={setNodeRef}
            role="list"
            aria-label={`${config.label} column, ${displayCount} application${displayCount !== 1 ? "s" : ""}`}
            className={`
        flex flex-col w-full min-w-0 rounded-xl border transition-all duration-200
        ${isOver ? "ring-2 ring-primary/40 bg-primary/5 border-primary/30" : "bg-muted/30"}
      `}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b sticky top-0 z-10 bg-muted/60 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${config.bgColor} ${config.color}`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                    </span>
                </div>
                <Badge
                    variant="secondary"
                    className="h-5 min-w-[1.25rem] px-1.5 text-xs font-mono justify-center"
                >
                    {displayCount}
                </Badge>
            </div>

            {/* Droppable / sortable area */}
            <SortableContext
                items={cardIds}
                strategy={verticalListSortingStrategy}
            >
                <div
                    className={`
            flex-1 p-2 space-y-2 min-h-[140px] transition-colors duration-200
            ${isOver ? "bg-primary/[0.03]" : ""}
            ${displayCount === 0 && !isOver ? "border-2 border-dashed border-transparent" : ""}
          `}
                >
                    {displayCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center px-4">
                            <Icon className="h-5 w-5 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground/60">
                                {config.emptyMessage}
                            </p>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </SortableContext>
        </div>
    );
});

// ============================================================================
// Sortable Item Wrapper
// ============================================================================

export const KanbanSortableItem = React.memo(function KanbanSortableItem({
    id,
    children,
}: KanbanSortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
        transition-opacity duration-150
        ${isDragging ? "opacity-40 scale-[0.98]" : "opacity-100"}
      `}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
});
