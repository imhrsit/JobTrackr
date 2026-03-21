"use client";

import { BarChart3, ChevronDown, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export interface FunnelStage {
    stage: string;
    count: number;
    percentage: number; // % of total
    color?: string;
}

interface Props {
    data: FunnelStage[];
    height?: number;
    isLoading?: boolean;
    rejectedCount?: number; // shown separately below the funnel
}

// ============================================================================
// Drop-off badge
// ============================================================================

function DropOffBadge({ from, to }: { from: number; to: number }) {
    if (from === 0) return null;
    const pct = Math.round((1 - to / from) * 100);
    if (pct <= 0) return null;

    return (
        <div className="flex items-center justify-center gap-1 py-0.5">
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/70">
                {pct}% drop-off
            </span>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

// Default gradient: blue → purple → amber → green
const DEFAULT_COLORS = ["#3b82f6", "#a855f7", "#8b5cf6", "#f59e0b", "#22c55e"];

export function FunnelChart({
    data,
    height = 300,
    isLoading,
    rejectedCount,
}: Props) {
    if (isLoading) {
        return <Skeleton style={{ height }} className="w-full rounded-lg" />;
    }

    const hasData = data.some((d) => d.count > 0);

    if (!hasData || data.length === 0) {
        return (
            <div
                style={{ height }}
                className="flex flex-col items-center justify-center gap-2"
            >
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No funnel data available
                </p>
            </div>
        );
    }

    const maxCount = Math.max(...data.map((d) => d.count));

    return (
        <div className="w-full space-y-0.5">
            {data.map((stage, idx) => {
                const color = stage.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                // Bar width: proportional to maxCount, minimum 6%
                const barPct =
                    maxCount > 0
                        ? Math.max(6, Math.round((stage.count / maxCount) * 100))
                        : 6;

                const prevStage = idx > 0 ? data[idx - 1] : null;

                return (
                    <div key={stage.stage}>
                        {/* Drop-off indicator */}
                        {prevStage && (
                            <DropOffBadge
                                from={prevStage.count}
                                to={stage.count}
                            />
                        )}

                        {/* Funnel row */}
                        <div className="flex items-center gap-3 group">
                            {/* Stage label */}
                            <span className="w-24 text-xs font-medium text-right shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                                {stage.stage}
                            </span>

                            {/* Bar track */}
                            <div className="flex-1 h-10 bg-muted/50 rounded-md overflow-hidden relative">
                                <div
                                    className="h-full flex items-center px-3 rounded-md transition-all duration-700 ease-out"
                                    style={{
                                        width: `${barPct}%`,
                                        backgroundColor: color,
                                        minWidth: stage.count > 0 ? "2.5rem" : 0,
                                    }}
                                >
                                    {stage.count > 0 && (
                                        <span className="text-white text-xs font-bold drop-shadow-sm">
                                            {stage.count}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Percentage badge */}
                            <div className="w-12 text-right shrink-0">
                                <span className="text-xs font-semibold tabular-nums">
                                    {stage.percentage}%
                                </span>
                            </div>

                            {/* Conversion dot */}
                            <div className="w-2 shrink-0">
                                <span
                                    className="block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: color, opacity: 0.6 }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Rejected note */}
            {typeof rejectedCount === "number" && rejectedCount > 0 && (
                <div className="pt-2 mt-1 border-t flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">
                        <span className="font-semibold text-red-600">
                            {rejectedCount}
                        </span>{" "}
                        application{rejectedCount !== 1 ? "s" : ""} rejected (not included
                        in funnel)
                    </span>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Helper: build FunnelStage[] from a Record<ApplicationStatus, number>
// ============================================================================

import type { ApplicationStatus } from "@prisma/client";
import { FUNNEL_STATUSES, STATUS_LABELS, STATUS_COLORS } from "./chart-config";

export function buildFunnelData(
    funnel: Record<ApplicationStatus, number>
): FunnelStage[] {
    const total = Object.values(funnel).reduce((s, c) => s + c, 0);
    return FUNNEL_STATUSES.map((status) => ({
        stage: STATUS_LABELS[status],
        count: funnel[status] ?? 0,
        percentage: total > 0 ? Math.round(((funnel[status] ?? 0) / total) * 100) : 0,
        color: STATUS_COLORS[status],
    }));
}
