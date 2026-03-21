"use client";

import { useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CHART_TOOLTIP_STYLE,
    AXIS_TICK_STYLE,
    CHART_GRID_STYLE,
    STATUS_COLORS,
} from "./chart-config";

// ============================================================================
// Types
// ============================================================================

export interface ApplicationsOverTimeDataPoint {
    date: string;
    applied: number;
    interviewing: number;
    offered: number;
}

interface Props {
    data: ApplicationsOverTimeDataPoint[];
    height?: number;
    isLoading?: boolean;
}

// ============================================================================
// Line definitions
// ============================================================================

const SERIES = [
    {
        key: "applied" as const,
        label: "Applied",
        color: STATUS_COLORS.APPLIED,
        dashArray: undefined,
    },
    {
        key: "interviewing" as const,
        label: "Interviewing",
        color: STATUS_COLORS.INTERVIEWING,
        dashArray: "5 3",
    },
    {
        key: "offered" as const,
        label: "Offered",
        color: STATUS_COLORS.OFFERED,
        dashArray: "2 4",
    },
] as const;

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipPayload {
    name: string;
    value: number;
    color: string;
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2 min-w-[140px]">
            <p className="font-semibold text-xs mb-2">{label}</p>
            {payload.map((entry) => (
                <div
                    key={entry.name}
                    className="flex items-center justify-between gap-4 text-xs"
                >
                    <span className="flex items-center gap-1.5">
                        <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: entry.color }}
                        />
                        {entry.name}
                    </span>
                    <span className="font-semibold tabular-nums">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function ApplicationsOverTimeChart({
    data,
    height = 300,
    isLoading,
}: Props) {
    const [hidden, setHidden] = useState<Set<string>>(new Set());

    if (isLoading) {
        return <Skeleton style={{ height }} className="w-full rounded-lg" />;
    }

    const hasData = data.some(
        (d) => d.applied > 0 || d.interviewing > 0 || d.offered > 0
    );

    if (!hasData) {
        return (
            <div
                style={{ height }}
                className="flex flex-col items-center justify-center gap-2 text-center"
            >
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No application activity in this period
                </p>
            </div>
        );
    }

    const toggle = (key: string) =>
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart
                data={data}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
                <defs>
                    {SERIES.map((s) => (
                        <linearGradient
                            key={s.key}
                            id={`aot-grad-${s.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor={s.color}
                                stopOpacity={0.18}
                            />
                            <stop
                                offset="95%"
                                stopColor={s.color}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    ))}
                </defs>

                <CartesianGrid {...CHART_GRID_STYLE} />

                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tick={AXIS_TICK_STYLE}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tick={AXIS_TICK_STYLE}
                    allowDecimals={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: "11px", cursor: "pointer", paddingTop: "8px" }}
                    onClick={(e) => toggle(e.dataKey as string)}
                    formatter={(value, entry) => (
                        <span
                            style={{
                                opacity: hidden.has(entry.dataKey as string) ? 0.35 : 1,
                                transition: "opacity 0.15s",
                            }}
                        >
                            {value}
                        </span>
                    )}
                />

                {SERIES.map((s) => (
                    <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        strokeDasharray={s.dashArray}
                        fill={`url(#aot-grad-${s.key})`}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        hide={hidden.has(s.key)}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
