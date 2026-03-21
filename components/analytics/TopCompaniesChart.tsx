"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationStatus } from "@prisma/client";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    ALL_STATUSES,
    CHART_TOOLTIP_STYLE,
    AXIS_TICK_STYLE,
    CHART_GRID_STYLE,
} from "./chart-config";

// ============================================================================
// Types
// ============================================================================

export interface CompanyDataPoint {
    company: string;
    count: number;
    byStatus: Partial<Record<ApplicationStatus, number>>;
}

interface Props {
    data: CompanyDataPoint[];
    height?: number;
    isLoading?: boolean;
    onCompanyClick?: (company: string) => void;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { name: string; value: number; fill: string }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
    const rows = payload.filter((p) => p.value > 0);

    return (
        <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2 min-w-[170px]">
            <p className="font-semibold text-xs mb-2 truncate max-w-[200px]">
                {label}
            </p>
            {rows.map((entry) => (
                <div
                    key={entry.name}
                    className="flex items-center justify-between gap-4 text-xs"
                >
                    <span className="flex items-center gap-1.5">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.fill }}
                        />
                        <span className="text-muted-foreground">{entry.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{entry.value}</span>
                </div>
            ))}
            <div className="border-t mt-2 pt-1.5 flex justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold tabular-nums">{total}</span>
            </div>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function TopCompaniesChart({
    data,
    height = 400,
    isLoading,
    onCompanyClick,
}: Props) {
    if (isLoading) {
        return <Skeleton style={{ height }} className="w-full rounded-lg" />;
    }

    if (!data.length) {
        return (
            <div
                style={{ height }}
                className="flex flex-col items-center justify-center gap-2"
            >
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No company data available
                </p>
            </div>
        );
    }

    // Normalise data: ensure every status key is present (0 if missing), sort by count desc
    const sorted = [...data]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((d) => ({
            company: d.company,
            ...Object.fromEntries(
                ALL_STATUSES.map((s) => [s, d.byStatus[s] ?? 0])
            ),
        }));

    // Only render status bars that have at least one non-zero value across all companies
    const activeStatuses = ALL_STATUSES.filter((s) =>
        sorted.some((d) => ((d as Record<string, unknown>)[s] as number) > 0)
    );

    // Dynamic height: at least 180px, 44px per bar
    const chartHeight = Math.max(height, sorted.length * 44 + 60);

    return (
        <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 4, bottom: 0 }}
                barCategoryGap="22%"
            >
                <CartesianGrid {...CHART_GRID_STYLE} horizontal={false} />

                <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tick={AXIS_TICK_STYLE}
                    allowDecimals={false}
                />
                <YAxis
                    type="category"
                    dataKey="company"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tick={AXIS_TICK_STYLE}
                    width={88}
                    tickFormatter={(v: string) =>
                        v.length > 14 ? v.slice(0, 14) + "…" : v
                    }
                />

                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                />

                <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                />

                {activeStatuses.map((status) => (
                    <Bar
                        key={status}
                        dataKey={status}
                        name={STATUS_LABELS[status]}
                        stackId="stack"
                        fill={STATUS_COLORS[status]}
                        radius={
                            status === activeStatuses[activeStatuses.length - 1]
                                ? [0, 4, 4, 0]
                                : [0, 0, 0, 0]
                        }
                        onClick={
                            onCompanyClick
                                ? (d) => onCompanyClick((d as unknown as Record<string, string>).company)
                                : undefined
                        }
                        style={{
                            cursor: onCompanyClick ? "pointer" : "default",
                        }}
                    >
                        {sorted.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={STATUS_COLORS[status]}
                            />
                        ))}
                    </Bar>
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
