"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
    Briefcase,
    Activity,
    Calendar,
    Award,
    Plus,
    LinkIcon,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    Pencil,
    Clock,
    TrendingUp,
    Rocket,
    Target,
    Zap,
    BarChart3,
    RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { DashboardData } from "@/types/dashboard";
import type { ApplicationStatus, InterviewType } from "@prisma/client";

// ============================================================================
// Props & Helpers
// ============================================================================

interface DashboardContentProps {
    userName: string;
}

const STATUS_CONFIG: Record<
    ApplicationStatus,
    { label: string; className: string }
> = {
    SAVED: {
        label: "Saved",
        className: "bg-secondary text-secondary-foreground",
    },
    APPLIED: { label: "Applied", className: "bg-blue-100 text-blue-800" },
    REFERRED: { label: "Referred", className: "bg-purple-100 text-purple-800" },
    INTERVIEWING: {
        label: "Interviewing",
        className: "bg-amber-100 text-amber-800",
    },
    OFFERED: { label: "Offered", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
    PHONE: "Phone",
    VIDEO: "Video",
    ONSITE: "Onsite",
    TECHNICAL: "Technical",
    BEHAVIORAL: "Behavioral",
    HR: "HR",
    FINAL: "Final",
};

function getInitials(company: string): string {
    return company
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardContent({ userName }: DashboardContentProps) {
    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useQuery<DashboardData>({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/stats");
            if (!res.ok) throw new Error("Failed to fetch dashboard data");
            return res.json();
        },
    });

    const today = format(new Date(), "EEEE, MMMM d, yyyy");
    const isNewUser = !isLoading && data && data.stats.totalApplications === 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ======== Welcome Header ======== */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                        Welcome back, {userName}!
                    </h1>
                    <p className="text-muted-foreground mt-1">{today}</p>
                </div>
                <div className="flex gap-3">
                    <Button asChild>
                        <Link href="/jobs/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Job
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast.info("Chrome extension work is in progress...")}
                    >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Import from URL
                    </Button>
                </div>
            </div>

            {/* ======== Loading State ======== */}
            {isLoading && <DashboardSkeleton />}

            {/* ======== Error State ======== */}
            {isError && (
                <Card className="border-destructive/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                            Failed to load dashboard data.
                        </p>
                        <Button variant="outline" onClick={() => refetch()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ======== Getting Started (New Users) ======== */}
            {isNewUser && <GettingStartedGuide />}

            {/* ======== Data Loaded ======== */}
            {!isLoading && !isError && data && (
                <>
                    {/* Stats Cards */}
                    <StatsCards stats={data.stats} />

                    {/* Two-column grid for recent apps + interviews */}
                    <div className="grid gap-8 lg:grid-cols-2">
                        <RecentApplications applications={data.recentApplications} />
                        <UpcomingInterviews interviews={data.upcomingInterviews} />
                    </div>

                    {/* Quick Insights */}
                    <QuickInsights
                        chartData={data.chartData}
                        topSkills={data.topSkills}
                        responseRate={data.responseRate}
                    />
                </>
            )}
        </div>
    );
}

// ============================================================================
// Stats Cards
// ============================================================================

function StatsCards({ stats }: { stats: DashboardData["stats"] }) {
    const trend =
        stats.totalLastMonth > 0
            ? Math.round(
                ((stats.totalApplications - stats.totalLastMonth) /
                    stats.totalLastMonth) *
                100
            )
            : stats.totalApplications > 0
                ? 100
                : 0;
    const trendUp = trend >= 0;

    const cards = [
        {
            title: "Total Applications",
            value: stats.totalApplications,
            subtitle: trendUp
                ? `+${trend}% from last month`
                : `${trend}% from last month`,
            icon: Briefcase,
            trendUp,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-600",
        },
        {
            title: "Active Applications",
            value: stats.activeApplications,
            subtitle: `${stats.activePercentage}% of total`,
            icon: Activity,
            trendUp: true,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-600",
        },
        {
            title: "Interviews Scheduled",
            value: stats.upcomingInterviews,
            subtitle: stats.nextInterviewDate
                ? `Next: ${format(new Date(stats.nextInterviewDate), "MMM d, h:mm a")}`
                : "No upcoming",
            icon: Calendar,
            trendUp: true,
            iconBg: "bg-purple-500/10",
            iconColor: "text-purple-600",
        },
        {
            title: "Offers Received",
            value: stats.offersReceived,
            subtitle: `${stats.successRate}% success rate`,
            icon: Award,
            trendUp: true,
            iconBg: "bg-green-500/10",
            iconColor: "text-green-600",
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
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            {card.title === "Total Applications" && (
                                <>
                                    {trendUp ? (
                                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                                    )}
                                </>
                            )}
                            {card.subtitle}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ============================================================================
// Recent Applications
// ============================================================================

function RecentApplications({
    applications,
}: {
    applications: DashboardData["recentApplications"];
}) {
    if (applications.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            No applications yet. Start by adding a job!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Applications</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/applications">
                        View All
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Applied</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.map((app) => {
                            const config = STATUS_CONFIG[app.status];
                            return (
                                <TableRow key={app.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                                                {getInitials(app.job.company)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-sm">
                                                    {app.job.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {app.job.company}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={config.className}
                                        >
                                            {config.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                        {app.appliedDate
                                            ? format(new Date(app.appliedDate), "MMM d, yyyy")
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/jobs/${app.id}`}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/jobs/${app.id}`}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Upcoming Interviews
// ============================================================================

function UpcomingInterviews({
    interviews,
}: {
    interviews: DashboardData["upcomingInterviews"];
}) {
    if (interviews.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            No upcoming interviews scheduled.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {interviews.map((interview) => {
                    const interviewDate = new Date(interview.interviewDate);
                    const countdown = formatDistanceToNow(interviewDate, {
                        addSuffix: true,
                    });

                    return (
                        <div
                            key={interview.id}
                            className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                        >
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <span className="text-xs font-semibold leading-none">
                                    {format(interviewDate, "MMM")}
                                </span>
                                <span className="text-lg font-bold leading-none mt-0.5">
                                    {format(interviewDate, "d")}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm truncate">
                                        {interview.application.job.title}
                                    </p>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {INTERVIEW_TYPE_LABELS[interview.interviewType]}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {interview.application.job.company}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(interviewDate, "h:mm a")}
                                    </span>
                                    <span className="text-primary font-medium">{countdown}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                                    <Link
                                        href={`/jobs/${interview.application.id}`}
                                    >
                                        Details
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Quick Insights
// ============================================================================

function QuickInsights({
    chartData,
    topSkills,
    responseRate,
}: {
    chartData: DashboardData["chartData"];
    topSkills: DashboardData["topSkills"];
    responseRate: number;
}) {
    const hasChartData = chartData.some((d) => d.count > 0);

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            {/* Chart */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Applications (Last 30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                    tick={{ fill: "var(--muted-foreground)" }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                    tick={{ fill: "var(--muted-foreground)" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--card)",
                                        fontSize: "12px",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="var(--primary)"
                                    fill="url(#fillArea)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                            <BarChart3 className="h-8 w-8 mr-2 opacity-30" />
                            No activity in the last 30 days
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Skills + Response Rate */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Top Skills */}
                    <div>
                        <p className="text-sm font-medium mb-3">Top Requested Skills</p>
                        {topSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {topSkills.map((skill) => (
                                    <Badge key={skill.name} variant="secondary">
                                        {skill.name}
                                        <span className="ml-1.5 text-muted-foreground">
                                            {skill.count}
                                        </span>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                No skill data yet
                            </p>
                        )}
                    </div>

                    {/* Response Rate */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Response Rate</p>
                            <span className="text-sm font-bold">{responseRate}%</span>
                        </div>
                        <Progress value={responseRate} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1.5">
                            Percentage of applications that received a response
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Getting Started Guide
// ============================================================================

function GettingStartedGuide() {
    const steps = [
        {
            icon: Plus,
            title: "Add your first job",
            description: "Save a job listing you're interested in to start tracking it.",
            href: "/jobs/new",
            cta: "Add a Job",
            color: "bg-blue-500/10 text-blue-600",
        },
        {
            icon: Target,
            title: "Track your application",
            description:
                "Update the status as you move through the application process.",
            href: "/applications",
            cta: "View Pipeline",
            color: "bg-amber-500/10 text-amber-600",
        },
        {
            icon: Zap,
            title: "Prepare for interviews",
            description:
                "Schedule interviews and set reminders so you never miss one.",
            href: "/interviews",
            cta: "Manage Interviews",
            color: "bg-purple-500/10 text-purple-600",
        },
    ];

    return (
        <Card className="border-dashed">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Rocket className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Get Started with JobTrackr</CardTitle>
                <CardDescription>
                    Follow these steps to organize your job search
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mt-4">
                    {steps.map((step, i) => (
                        <div
                            key={step.title}
                            className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {i + 1}
                                </span>
                                <div className={`rounded-lg p-2 ${step.color}`}>
                                    <step.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                {step.description}
                            </p>
                            <Button variant="outline" size="sm" className="mt-auto" asChild>
                                <Link href={step.href}>{step.cta}</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Stats skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-28" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Content skeleton */}
            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-md" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Chart skeleton */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[220px] w-full rounded-lg" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Skeleton className="h-4 w-32 mb-3" />
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-16 rounded-md" />
                                <Skeleton className="h-6 w-20 rounded-md" />
                                <Skeleton className="h-6 w-14 rounded-md" />
                            </div>
                        </div>
                        <div>
                            <Skeleton className="h-4 w-28 mb-2" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
