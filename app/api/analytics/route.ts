import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    subDays,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
    eachDayOfInterval,
    eachWeekOfInterval,
    differenceInDays,
    isValid,
    parseISO,
} from "date-fns";
import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export type GroupBy = "day" | "week" | "month";

export interface AnalyticsData {
    overview: {
        totalApplications: number;
        applied: number;
        interviewing: number;
        offered: number;
        rejected: number;
        responseRate: number;
        interviewRate: number;
        offerRate: number;
        avgTimeToResponse: number; // days
        trends: {
            applicationsChange: number; // percentage vs previous period
            responseRateChange: number;
        };
    };
    funnel: Record<ApplicationStatus, number>;
    timeseries: {
        date: string;
        applied: number;
        interviewing: number;
        offered: number;
        total: number;
    }[];
    topCompanies: {
        company: string;
        total: number;
        byStatus: Partial<Record<ApplicationStatus, number>>;
    }[];
    topSkills: {
        skill: string;
        count: number;
        userHas: boolean;
        category: string;
    }[];
    insights: {
        bestDayToApply: string;
        avgApplicationsPerWeek: number;
        successRate: number;
    };
}

// ============================================================================
// Helpers
// ============================================================================

const ALL_STATUSES: ApplicationStatus[] = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
];

function parseDate(value: string | null, fallback: Date): Date {
    if (!value) return fallback;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : fallback;
}

function buildStatusMap(
    counts: { status: ApplicationStatus; _count: { _all: number } }[]
): Record<ApplicationStatus, number> {
    const map = Object.fromEntries(
        ALL_STATUSES.map((s) => [s, 0])
    ) as Record<ApplicationStatus, number>;
    for (const row of counts) {
        map[row.status] = row._count._all;
    }
    return map;
}

const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        // Auth
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        // Parse params
        const { searchParams } = new URL(req.url);
        const now = new Date();
        const defaultStart = subDays(now, 30);

        const startDate = startOfDay(
            parseDate(searchParams.get("dateFrom"), defaultStart)
        );
        const endDate = endOfDay(
            parseDate(searchParams.get("dateTo"), now)
        );
        const groupByParam = (searchParams.get("groupBy") ?? "day") as GroupBy;

        if (!["day", "week", "month"].includes(groupByParam)) {
            return NextResponse.json(
                { error: "Invalid groupBy value. Must be day, week, or month." },
                { status: 400 }
            );
        }
        if (startDate > endDate) {
            return NextResponse.json(
                { error: "dateFrom must be before dateTo." },
                { status: 400 }
            );
        }

        // Previous period (same length) for trend comparison
        const periodMs = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - periodMs - 1);
        const prevEnd = new Date(startDate.getTime() - 1);

        // ── Parallel queries ─────────────────────────────────────────────────
        const [
            statusCounts,
            prevStatusCounts,
            applications,
            appsWithInterviews,
            userSkills,
        ] = await Promise.all([
            // Aggregated status distribution for current period
            prisma.application.groupBy({
                by: ["status"],
                where: { userId, createdAt: { gte: startDate, lte: endDate } },
                _count: { _all: true },
            }),

            // Previous period for trend comparison
            prisma.application.groupBy({
                by: ["status"],
                where: { userId, createdAt: { gte: prevStart, lte: prevEnd } },
                _count: { _all: true },
            }),

            // Minimal application data for timeseries, companies, skills
            prisma.application.findMany({
                where: { userId, createdAt: { gte: startDate, lte: endDate } },
                select: {
                    status: true,
                    createdAt: true,
                    appliedDate: true,
                    job: {
                        select: {
                            company: true,
                            jobSkills: {
                                select: {
                                    skill: {
                                        select: {
                                            name: true,
                                            category: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            }),

            // Applications that have interviews — for avgTimeToResponse
            prisma.application.findMany({
                where: {
                    userId,
                    appliedDate: { not: null },
                    interviews: { some: {} },
                },
                select: {
                    appliedDate: true,
                    interviews: {
                        orderBy: { interviewDate: "asc" },
                        take: 1,
                        select: { interviewDate: true },
                    },
                },
            }),

            // User's own skills for match analysis
            prisma.userSkill.findMany({
                where: { userId },
                select: { skill: { select: { name: true } } },
            }),
        ]);

        // ── Overview metrics ─────────────────────────────────────────────────
        const statusMap = buildStatusMap(statusCounts);
        const prevStatusMap = buildStatusMap(prevStatusCounts);

        const total = ALL_STATUSES.reduce((s, k) => s + statusMap[k], 0);
        const prevTotal = ALL_STATUSES.reduce((s, k) => s + prevStatusMap[k], 0);

        const responded =
            statusMap["INTERVIEWING"] + statusMap["OFFERED"] + statusMap["REJECTED"];
        const prevResponded =
            prevStatusMap["INTERVIEWING"] +
            prevStatusMap["OFFERED"] +
            prevStatusMap["REJECTED"];

        const responseRate =
            total > 0 ? Math.round((responded / total) * 100) : 0;
        const interviewRate =
            total > 0 ? Math.round((statusMap["INTERVIEWING"] / total) * 100) : 0;
        const offerRate =
            statusMap["INTERVIEWING"] > 0
                ? Math.round(
                    (statusMap["OFFERED"] / statusMap["INTERVIEWING"]) * 100
                )
                : 0;

        const applicationsChange =
            prevTotal > 0
                ? Math.round(((total - prevTotal) / prevTotal) * 100)
                : total > 0
                    ? 100
                    : 0;

        const prevResponseRate =
            prevTotal > 0 ? Math.round((prevResponded / prevTotal) * 100) : 0;
        const responseRateChange = responseRate - prevResponseRate;

        // Average time to first interview (days from appliedDate)
        const responseTimes = appsWithInterviews
            .filter((a) => a.appliedDate && a.interviews.length > 0)
            .map((a) =>
                differenceInDays(
                    new Date(a.interviews[0].interviewDate),
                    new Date(a.appliedDate!)
                )
            )
            .filter((d) => d >= 0);
        const avgTimeToResponse =
            responseTimes.length > 0
                ? Math.round(
                    responseTimes.reduce((s, d) => s + d, 0) / responseTimes.length
                )
                : 0;

        // ── Funnel ───────────────────────────────────────────────────────────
        const funnel = statusMap;

        // ── Timeseries ───────────────────────────────────────────────────────
        type TimeItem = {
            date: string;
            applied: number;
            interviewing: number;
            offered: number;
            total: number;
        };

        function bucketsFromApps(
            bucketStart: Date,
            bucketEnd: Date,
            label: string
        ): TimeItem {
            const bucket = applications.filter((a) => {
                const d = new Date(a.createdAt);
                return d >= bucketStart && d <= bucketEnd;
            });
            return {
                date: label,
                total: bucket.length,
                applied: bucket.filter((a) =>
                    ["APPLIED", "REFERRED"].includes(a.status)
                ).length,
                interviewing: bucket.filter(
                    (a) => a.status === "INTERVIEWING"
                ).length,
                offered: bucket.filter((a) => a.status === "OFFERED").length,
            };
        }

        let timeseries: TimeItem[] = [];

        if (groupByParam === "day") {
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            timeseries = days.map((d) =>
                bucketsFromApps(startOfDay(d), endOfDay(d), format(d, "MMM dd"))
            );
        } else if (groupByParam === "week") {
            const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
            timeseries = weeks.map((w) =>
                bucketsFromApps(
                    startOfWeek(w),
                    endOfWeek(w),
                    format(startOfWeek(w), "MMM dd")
                )
            );
        } else {
            // month — generate buckets manually for compatibility
            const months: Date[] = [];
            let cur = startOfMonth(startDate);
            while (cur <= endDate) {
                months.push(cur);
                cur = startOfMonth(
                    new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
                );
            }
            timeseries = months.map((m) =>
                bucketsFromApps(
                    startOfMonth(m),
                    endOfMonth(m),
                    format(m, "MMM yyyy")
                )
            );
        }

        // ── Top companies ────────────────────────────────────────────────────
        const companyMap = new Map<
            string,
            { total: number; byStatus: Partial<Record<ApplicationStatus, number>> }
        >();
        for (const app of applications) {
            const c = app.job.company;
            if (!companyMap.has(c)) companyMap.set(c, { total: 0, byStatus: {} });
            const entry = companyMap.get(c)!;
            entry.total++;
            entry.byStatus[app.status] = (entry.byStatus[app.status] ?? 0) + 1;
        }
        const topCompanies = Array.from(companyMap.entries())
            .map(([company, d]) => ({ company, ...d }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // ── Top skills ───────────────────────────────────────────────────────
        const userSkillNames = new Set(userSkills.map((us) => us.skill.name));
        const skillMap = new Map<
            string,
            { count: number; category: string }
        >();
        for (const app of applications) {
            for (const js of app.job.jobSkills) {
                const name = js.skill.name;
                if (!skillMap.has(name)) {
                    skillMap.set(name, {
                        count: 0,
                        category: js.skill.category ?? "",
                    });
                }
                skillMap.get(name)!.count++;
            }
        }
        const topSkills = Array.from(skillMap.entries())
            .map(([skill, d]) => ({
                skill,
                count: d.count,
                userHas: userSkillNames.has(skill),
                category: d.category,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        // ── Insights ─────────────────────────────────────────────────────────
        // Best day to apply: day of week most correlated with successful outcomes
        const dayCounts = new Array(7).fill(0);
        for (const app of applications) {
            if (["INTERVIEWING", "OFFERED"].includes(app.status)) {
                const date = app.appliedDate
                    ? new Date(app.appliedDate)
                    : new Date(app.createdAt);
                dayCounts[date.getDay()]++;
            }
        }
        const maxDayCount = Math.max(...dayCounts);
        const bestDayToApply =
            maxDayCount > 0
                ? DAY_NAMES[dayCounts.indexOf(maxDayCount)]
                : "N/A";

        // Average applications per week
        const totalWeeks = Math.max(
            1,
            (endDate.getTime() - startDate.getTime()) / (7 * 86400 * 1000)
        );
        const avgApplicationsPerWeek =
            Math.round((total / totalWeeks) * 10) / 10;

        // Success rate: offers / total
        const successRate =
            total > 0
                ? Math.round((statusMap["OFFERED"] / total) * 100)
                : 0;

        // ── Response ─────────────────────────────────────────────────────────
        const data: AnalyticsData = {
            overview: {
                totalApplications: total,
                applied: statusMap["APPLIED"],
                interviewing: statusMap["INTERVIEWING"],
                offered: statusMap["OFFERED"],
                rejected: statusMap["REJECTED"],
                responseRate,
                interviewRate,
                offerRate,
                avgTimeToResponse,
                trends: { applicationsChange, responseRateChange },
            },
            funnel,
            timeseries,
            topCompanies,
            topSkills,
            insights: {
                bestDayToApply,
                avgApplicationsPerWeek,
                successRate,
            },
        };

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[analytics] GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics data." },
            { status: 500 }
        );
    }
}
