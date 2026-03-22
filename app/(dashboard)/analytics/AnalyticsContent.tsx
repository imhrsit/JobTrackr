"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import {
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Award,
    MessageSquare,
    Download,
    RefreshCw,
    Clock,
    Calendar,
    Zap,
    BarChart3,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    ApplicationsOverTimeChart,
    StatusDistributionChart,
    TopCompaniesChart,
    FunnelChart,
    SkillsChart,
    buildFunnelData,
    CHART_TOOLTIP_STYLE,
    AXIS_TICK_STYLE,
    CHART_GRID_STYLE,
} from "@/components/analytics";
import type { AnalyticsData, GroupBy } from "@/app/api/analytics/route";

// ============================================================================
// Types
// ============================================================================

type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsContent() {
    const [preset, setPreset] = useState<DatePreset>("30d");
    const [groupBy, setGroupBy] = useState<GroupBy>("day");
    const [customFrom, setCustomFrom] = useState(
        format(subDays(new Date(), 30), "yyyy-MM-dd")
    );
    const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));

    const { dateFrom, dateTo } = useMemo(() => {
        const now = new Date();
        if (preset === "7d")
            return {
                dateFrom: format(subDays(now, 7), "yyyy-MM-dd"),
                dateTo: format(now, "yyyy-MM-dd"),
            };
        if (preset === "30d")
            return {
                dateFrom: format(subDays(now, 30), "yyyy-MM-dd"),
                dateTo: format(now, "yyyy-MM-dd"),
            };
        if (preset === "90d")
            return {
                dateFrom: format(subDays(now, 90), "yyyy-MM-dd"),
                dateTo: format(now, "yyyy-MM-dd"),
            };
        if (preset === "custom") return { dateFrom: customFrom, dateTo: customTo };
        return { dateFrom: undefined, dateTo: undefined };
    }, [preset, customFrom, customTo]);

    const { data, isLoading, isError, refetch } = useQuery<AnalyticsData>({
        queryKey: ["analytics", dateFrom, dateTo, groupBy],
        queryFn: async () => {
            const params = new URLSearchParams({ groupBy });
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);
            const res = await fetch(`/api/analytics?${params}`, { cache: "no-store" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Failed to fetch analytics");
            }
            return res.json();
        },
        staleTime: 0,
    });

    const handleExportCSV = () => {
        if (!data) return;
        const rows: (string | number)[][] = [
            ["Metric", "Value"],
            ["Total Applications", data.overview.totalApplications],
            ["Response Rate (%)", data.overview.responseRate],
            ["Interview Rate (%)", data.overview.interviewRate],
            ["Offer Rate (%)", data.overview.offerRate],
            ["Avg Days to Interview", data.overview.avgTimeToResponse],
            [],
            ["Date", "Total", "Applied", "Interviewing", "Offered"],
            ...data.timeseries.map((t) => [
                t.date,
                t.total,
                t.applied,
                t.interviewing,
                t.offered,
            ]),
            [],
            ["Company", "Applications"],
            ...data.topCompanies.map((c) => [c.company, c.total]),
        ];
        const csv = rows
            .map((r) => r.map((v) => `"${v}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                        Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Insights into your job search performance
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={groupBy}
                        onValueChange={(v) => setGroupBy(v as GroupBy)}
                    >
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">By day</SelectItem>
                            <SelectItem value="week">By week</SelectItem>
                            <SelectItem value="month">By month</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={preset}
                        onValueChange={(v) => setPreset(v as DatePreset)}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>

                    {preset === "custom" && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="w-36 text-sm"
                            />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="w-36 text-sm"
                            />
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={!data}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* ── Loading ── */}
            {isLoading && <AnalyticsSkeleton />}

            {/* ── Error ── */}
            {isError && (
                <Card className="border-destructive/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                            Failed to load analytics data.
                        </p>
                        <Button variant="outline" onClick={() => refetch()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ── Data ── */}
            {!isLoading && !isError && data && (
                <>
                    <OverviewCards data={data} />

                    {/* Funnel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Application Funnel
                            </CardTitle>
                            <CardDescription>
                                Conversion through each stage of your job search
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FunnelChart
                                data={buildFunnelData(data.funnel)}
                                rejectedCount={data.funnel.REJECTED}
                            />
                        </CardContent>
                    </Card>

                    {/* Charts 2×2 */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Applications Over Time */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Applications Over Time
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ApplicationsOverTimeChart
                                    data={data.timeseries}
                                    height={260}
                                />
                            </CardContent>
                        </Card>

                        {/* Status Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    Status Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatusDistributionChart data={data.funnel} height={320} />
                            </CardContent>
                        </Card>

                        {/* Top Companies */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Top Companies
                                </CardTitle>
                                <CardDescription>
                                    Top 10 by application count
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TopCompaniesChart
                                    data={data.topCompanies.map((c) => ({
                                        company: c.company,
                                        count: c.total,
                                        byStatus: c.byStatus,
                                    }))}
                                    height={300}
                                />
                            </CardContent>
                        </Card>

                        {/* Application Velocity */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Application Velocity
                                </CardTitle>
                                <CardDescription>
                                    Application volume over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VelocityChart timeseries={data.timeseries} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Insights */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Skills */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Skills Analysis
                                </CardTitle>
                                <CardDescription>
                                    Most requested skills across your applications
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SkillsChart
                                    skills={data.topSkills.map((s) => ({
                                        name: s.skill,
                                        count: s.count,
                                        userHas: s.userHas,
                                    }))}
                                    height={360}
                                    limit={12}
                                />
                            </CardContent>
                        </Card>

                        {/* Success Patterns */}
                        <InsightsPanel data={data} />
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================================
// Overview Cards
// ============================================================================

function OverviewCards({ data }: { data: AnalyticsData }) {
    const { overview } = data;
    const appTrendUp = overview.trends.applicationsChange >= 0;
    const responseUp = overview.trends.responseRateChange >= 0;

    const cards = [
        {
            title: "Total Applications",
            value: overview.totalApplications,
            icon: Users,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-600",
            trend: overview.trends.applicationsChange,
            trendUp: appTrendUp,
            subtitle: "",
        },
        {
            title: "Response Rate",
            value: `${overview.responseRate}%`,
            icon: MessageSquare,
            iconBg: "bg-purple-500/10",
            iconColor: "text-purple-600",
            trend: overview.trends.responseRateChange,
            trendUp: responseUp,
            subtitle: "",
        },
        {
            title: "Interview Rate",
            value: `${overview.interviewRate}%`,
            icon: Target,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-600",
            trend: null,
            trendUp: true,
            subtitle: "Applications → Interview",
        },
        {
            title: "Offer Rate",
            value: `${overview.offerRate}%`,
            icon: Award,
            iconBg: "bg-green-500/10",
            iconColor: "text-green-600",
            trend: null,
            trendUp: true,
            subtitle: "Interviews → Offers",
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.title} className="transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardDescription className="text-sm font-medium">
                            {card.title}
                        </CardDescription>
                        <div className={`rounded-lg p-2 ${card.iconBg}`}>
                            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{card.value}</div>
                        {card.trend !== null ? (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                {card.trendUp ? (
                                    <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600 shrink-0" />
                                )}
                                <span
                                    className={
                                        card.trendUp ? "text-green-600" : "text-red-600"
                                    }
                                >
                                    {card.trendUp ? "+" : ""}
                                    {card.trend}
                                    {card.title === "Response Rate" ? "pp" : "%"}
                                </span>
                                <span>vs last period</span>
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.subtitle}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}

            {overview.avgTimeToResponse > 0 && (
                <Card className="sm:col-span-2 lg:col-span-4 bg-muted/30 border-dashed">
                    <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                Average{" "}
                                <span className="text-blue-600 font-semibold">
                                    {overview.avgTimeToResponse} days
                                </span>{" "}
                                from application to first interview
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Based on applications with scheduled interviews
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ============================================================================
// Application Velocity (inline — shows total applications as area chart)
// ============================================================================

function VelocityChart({
    timeseries,
}: {
    timeseries: AnalyticsData["timeseries"];
}) {
    const hasData = timeseries.some((t) => t.total > 0);
    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-[260px] gap-2">
                <BarChart3 className="h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                    No activity in this period
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart
                data={timeseries}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
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
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area
                    type="monotone"
                    dataKey="total"
                    name="Applications"
                    stroke="#6366f1"
                    fill="url(#velGrad)"
                    strokeWidth={2}
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ============================================================================
// Insights Panel
// ============================================================================

function InsightsPanel({ data }: { data: AnalyticsData }) {
    const { insights, overview, funnel, topSkills } = data;
    const ownedCount = topSkills.filter((s) => s.userHas).length;

    const referralConv =
        funnel.REFERRED > 0 ? funnel.OFFERED / funnel.REFERRED : 0;
    const directConv = funnel.APPLIED > 0 ? funnel.OFFERED / funnel.APPLIED : 0;
    const referralBoost =
        referralConv > 0 && directConv > 0
            ? (referralConv / directConv).toFixed(1)
            : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Insights</CardTitle>
                <CardDescription>Patterns in your job search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {overview.totalApplications === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No data yet
                    </p>
                ) : (
                    <>
                        {/* Rate bars */}
                        <div className="space-y-3">
                            {[
                                {
                                    label: "Response rate",
                                    value: overview.responseRate,
                                },
                                {
                                    label: "Interview rate",
                                    value: overview.interviewRate,
                                },
                                {
                                    label: "Offer rate",
                                    value: overview.offerRate,
                                },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {item.value}%
                                        </span>
                                    </div>
                                    <Progress value={item.value} className="h-1.5" />
                                </div>
                            ))}
                        </div>

                        {/* Stat tiles */}
                        <div className="border-t pt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        Best day
                                    </span>
                                </div>
                                <p className="text-sm font-semibold">
                                    {insights.bestDayToApply}
                                </p>
                                <p className="text-xs text-muted-foreground">to apply</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        Avg / week
                                    </span>
                                </div>
                                <p className="text-sm font-semibold">
                                    {insights.avgApplicationsPerWeek}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    applications
                                </p>
                            </div>
                        </div>

                        {/* Pattern highlights */}
                        <div className="space-y-2">
                            {referralBoost && parseFloat(referralBoost) > 1 && (
                                <div className="rounded-lg bg-green-500/10 p-3">
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                        Referrals work!
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Referred applications have{" "}
                                        <span className="font-semibold text-green-600">
                                            {referralBoost}x
                                        </span>{" "}
                                        higher offer rate
                                    </p>
                                </div>
                            )}

                            {funnel.REFERRED === 0 && (
                                <div className="rounded-lg bg-blue-500/10 p-3">
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                        Try referrals
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Referrals typically have 3–5× higher success
                                        rates
                                    </p>
                                </div>
                            )}

                            {ownedCount > 0 && (
                                <div className="rounded-lg bg-muted p-3">
                                    <p className="text-sm font-medium">
                                        Skill coverage
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        You have{" "}
                                        <span className="font-semibold">
                                            {ownedCount}
                                        </span>{" "}
                                        of the top{" "}
                                        {Math.min(topSkills.length, 12)} requested
                                        skills
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function AnalyticsSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-44" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                </CardContent>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-44" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full rounded-lg" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
