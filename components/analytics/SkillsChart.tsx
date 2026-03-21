"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
    Cell,
} from "recharts";
import { BarChart3, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CHART_TOOLTIP_STYLE,
    AXIS_TICK_STYLE,
    CHART_GRID_STYLE,
} from "./chart-config";

// ============================================================================
// Types
// ============================================================================

export interface SkillDataPoint {
    name: string;
    count: number;
    userHas: boolean;
}

interface Props {
    skills: SkillDataPoint[];
    height?: number;
    isLoading?: boolean;
    limit?: number;
}

// ============================================================================
// Colors
// ============================================================================

const COLOR_HAS = "#22c55e"; // green-500
const COLOR_GAP = "#a855f7"; // purple-500

// ============================================================================
// Custom Tooltip
// ============================================================================

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { value: number; payload: SkillDataPoint }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    const { value, payload: data } = payload[0];
    return (
        <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2 min-w-[160px]">
            <p className="font-semibold text-xs mb-1.5">{label}</p>
            <p className="text-xs text-muted-foreground">
                Requested in{" "}
                <span className="font-bold text-foreground tabular-nums">
                    {value}
                </span>{" "}
                job{value !== 1 ? "s" : ""}
            </p>
            <p className="text-xs mt-1 flex items-center gap-1">
                {data.userHas ? (
                    <>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">You have this skill</span>
                    </>
                ) : (
                    <>
                        <XCircle className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-muted-foreground">Skill gap</span>
                    </>
                )}
            </p>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function SkillsChart({
    skills,
    height = 400,
    isLoading,
    limit = 15,
}: Props) {
    if (isLoading) {
        return <Skeleton style={{ height }} className="w-full rounded-lg" />;
    }

    const top = [...skills]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    if (!top.length) {
        return (
            <div
                style={{ height }}
                className="flex flex-col items-center justify-center gap-2"
            >
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No skill data — add skills to your job applications
                </p>
            </div>
        );
    }

    // Dynamic height: 32px per skill + header/footer space
    const chartHeight = Math.max(height, top.length * 34 + 40);

    return (
        <div className="space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                <span className="flex items-center gap-1.5">
                    <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLOR_HAS }}
                    />
                    You have this skill
                </span>
                <span className="flex items-center gap-1.5">
                    <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLOR_GAP }}
                    />
                    Skill gap
                </span>
            </div>

            <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                    data={top}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
                    barCategoryGap="18%"
                >
                    <CartesianGrid
                        {...CHART_GRID_STYLE}
                        horizontal={false}
                    />
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
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        tick={AXIS_TICK_STYLE}
                        width={90}
                        tickFormatter={(v: string) =>
                            v.length > 14 ? v.slice(0, 14) + "…" : v
                        }
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.55 }}
                    />
                    <Bar
                        dataKey="count"
                        name="Jobs"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={28}
                    >
                        {/* Count label inside/outside bar */}
                        <LabelList
                            dataKey="count"
                            position="right"
                            style={{
                                fill: "hsl(var(--muted-foreground))",
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />
                        {/* Per-bar colour: green if user has it, purple otherwise */}
                        {top.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={entry.userHas ? COLOR_HAS : COLOR_GAP}
                                opacity={0.85}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
