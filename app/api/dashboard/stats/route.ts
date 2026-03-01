import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import type { DashboardData } from "@/types/dashboard";

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);
        const startOfLastMonth = subDays(now, 60);
        const endOfLastMonth = subDays(now, 30);

        // Run all queries in parallel
        const [
            totalApplications,
            totalLastMonth,
            activeApplications,
            offersReceived,
            upcomingInterviewsData,
            recentApplicationsData,
            chartRawData,
            topSkillsData,
            respondedCount,
        ] = await Promise.all([
            // Total applications
            prisma.application.count({
                where: { userId },
            }),

            // Total applications last month (for trend comparison)
            prisma.application.count({
                where: {
                    userId,
                    createdAt: { gte: startOfLastMonth, lt: endOfLastMonth },
                },
            }),

            // Active applications (APPLIED + INTERVIEWING)
            prisma.application.count({
                where: {
                    userId,
                    status: { in: ["APPLIED", "INTERVIEWING"] },
                },
            }),

            // Offers received
            prisma.application.count({
                where: {
                    userId,
                    status: "OFFERED",
                },
            }),

            // Upcoming interviews (next 3, not completed, future dates)
            prisma.interview.findMany({
                where: {
                    application: { userId },
                    interviewDate: { gte: now },
                    completed: false,
                },
                orderBy: { interviewDate: "asc" },
                take: 3,
                include: {
                    application: {
                        include: {
                            job: { select: { title: true, company: true } },
                        },
                    },
                },
            }),

            // Recent applications (last 5)
            prisma.application.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    job: { select: { title: true, company: true } },
                },
            }),

            // Applications over last 30 days (for chart)
            prisma.application.findMany({
                where: {
                    userId,
                    createdAt: { gte: thirtyDaysAgo },
                },
                select: { createdAt: true },
                orderBy: { createdAt: "asc" },
            }),

            // Top skills from jobs the user applied to
            prisma.jobSkill.findMany({
                where: {
                    job: {
                        application: { userId },
                    },
                },
                include: { skill: { select: { name: true } } },
            }),

            // Applications with a response (not SAVED)
            prisma.application.count({
                where: {
                    userId,
                    status: { notIn: ["SAVED", "APPLIED"] },
                },
            }),
        ]);

        // Build chart data — fill in all 30 days
        const chartData: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const day = startOfDay(subDays(now, i));
            const dayStr = format(day, "MMM dd");
            const count = chartRawData.filter((a) => {
                const d = startOfDay(new Date(a.createdAt));
                return d.getTime() === day.getTime();
            }).length;
            chartData.push({ date: dayStr, count });
        }

        // Aggregate top skills
        const skillCounts: Record<string, number> = {};
        topSkillsData.forEach((js) => {
            const name = js.skill.name;
            skillCounts[name] = (skillCounts[name] || 0) + 1;
        });
        const topSkills = Object.entries(skillCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // Stats
        const activePercentage =
            totalApplications > 0
                ? Math.round((activeApplications / totalApplications) * 100)
                : 0;

        const successRate =
            totalApplications > 0
                ? Math.round((offersReceived / totalApplications) * 100)
                : 0;

        const responseRate =
            totalApplications > 0
                ? Math.round((respondedCount / totalApplications) * 100)
                : 0;

        const nextInterviewDate =
            upcomingInterviewsData.length > 0
                ? upcomingInterviewsData[0].interviewDate.toISOString()
                : null;

        const data: DashboardData = {
            stats: {
                totalApplications,
                totalLastMonth,
                activeApplications,
                activePercentage,
                upcomingInterviews: upcomingInterviewsData.length,
                nextInterviewDate,
                offersReceived,
                successRate,
            },
            recentApplications: recentApplicationsData.map((a) => ({
                id: a.id,
                jobId: a.jobId,
                status: a.status,
                appliedDate: a.appliedDate?.toISOString() ?? null,
                job: a.job,
            })),
            upcomingInterviews: upcomingInterviewsData.map((i) => ({
                id: i.id,
                interviewDate: i.interviewDate.toISOString(),
                interviewType: i.interviewType,
                interviewerName: i.interviewerName,
                location: i.location,
                application: {
                    id: i.application.id,
                    job: i.application.job,
                },
            })),
            chartData,
            topSkills,
            responseRate,
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
}
