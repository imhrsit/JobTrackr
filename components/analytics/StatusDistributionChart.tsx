"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationStatus } from "@prisma/client";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    ALL_STATUSES,
    CHART_TOOLTIP_STYLE,
} from "./chart-config";

// ============================================================================
// Types
// ============================================================================

interface Props {
    data: Record<ApplicationStatus, number>;
    height?: number;
    isLoading?: boolean;
    onStatusClick?: (status: ApplicationStatus) => void;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

function CustomTooltip({
    active,
    payload,
    total,
}: {
    active?: boolean;
    payload?: { name: string; value: number; payload: { status: ApplicationStatus } }[];
    total: number;
}) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2">
            <p className="font-semibold text-xs mb-1">{name}</p>
            <p className="text-xs">
                <span className="font-bold tabular-nums">{value}</span>
                <span className="text-muted-foreground ml-1.5">({pct}%)</span>
            </p>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function StatusDistributionChart({
    data,
    height = 400,
    isLoading,
    onStatusClick,
}: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (isLoading) {
        return <Skeleton style={{ height }} className="w-full rounded-lg" />;
    }

    const pieData = ALL_STATUSES.map((status) => ({
        name: STATUS_LABELS[status],
        value: data[status] ?? 0,
        status,
        color: STATUS_COLORS[status],
    })).filter((d) => d.value > 0);

    const total = pieData.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div
                style={{ height }}
                className="flex flex-col items-center justify-center gap-2"
            >
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No applications in this period
                </p>
            </div>
        );
    }

    const donutHeight = Math.min(height, 260);
    const outerRadius = Math.min(donutHeight / 2 - 8, 110);
    const innerRadius = Math.round(outerRadius * 0.62);

    return (
        <div className="flex flex-col gap-4">
            {/* Donut with centre label */}
            <div className="relative mx-auto" style={{ height: donutHeight, width: "100%" }}>
                <ResponsiveContainer width="100%" height={donutHeight}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            paddingAngle={2}
                            dataKey="value"
                            onMouseEnter={(_, idx) => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onClick={(entry) =>
                                onStatusClick?.(entry.status as ApplicationStatus)
                            }
                            style={{ cursor: onStatusClick ? "pointer" : "default" }}
                        >
                            {pieData.map((entry, idx) => (
                                <Cell
                                    key={entry.status}
                                    fill={entry.color}
                                    opacity={
                                        activeIndex === null || activeIndex === idx
                                            ? 1
                                            : 0.45
                                    }
                                    stroke={
                                        activeIndex === idx
                                            ? "hsl(var(--background))"
                                            : "transparent"
                                    }
                                    strokeWidth={activeIndex === idx ? 2 : 0}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={<CustomTooltip total={total} />}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold leading-none">{total}</span>
                    <span className="text-xs text-muted-foreground mt-1">Total</span>
                </div>
            </div>

            {/* Legend rows */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {pieData.map((entry) => {
                    const pct = Math.round((entry.value / total) * 100);
                    return (
                        <button
                            key={entry.status}
                            className="flex items-center justify-between gap-2 text-sm rounded-md px-1 py-0.5 hover:bg-muted/60 transition-colors text-left w-full"
                            onClick={() => onStatusClick?.(entry.status)}
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground truncate text-xs">
                                    {entry.name}
                                </span>
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                                <span className="font-medium tabular-nums text-xs">
                                    {entry.value}
                                </span>
                                <span className="text-muted-foreground/60 text-xs w-7 text-right tabular-nums">
                                    {pct}%
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
