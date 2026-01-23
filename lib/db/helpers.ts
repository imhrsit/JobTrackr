import { prisma } from "../prisma";
import type { Prisma, ApplicationStatus, WorkMode } from ".prisma/client";

export type JobFilters = {
    title?: string;
    company?: string;
    location?: string;
    workMode?: WorkMode;
    salaryMin?: number;
    salaryMax?: number;
    status?: ApplicationStatus;
};

export type DateRange = {
    from: Date;
    to: Date;
};

export type ApplicationMetrics = {
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    averageResponseTime: number;
    interviewRate: number;
    offerRate: number;
};

export type SkillsAnalysis = {
    userSkills: Array<{ name: string; proficiency: string; category: string | null }>;
    jobSkills: Array<{ name: string; requiredCount: number; category: string | null }>;
    matchingSkills: string[];
    missingSkills: string[];
};

export async function getJobWithDetails(jobId: string) {
    return await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            application: {
                include: {
                    interviews: true,
                    referrals: true,
                    activities: true,
                },
            },
            jobSkills: {
                include: {
                    skill: true,
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
}

export async function getUserJobs(userId: string, filters?: JobFilters) {
    const where = buildJobFilters({ ...filters, userId });

    return await prisma.job.findMany({
        where,
        include: {
            application: {
                select: {
                    status: true,
                    appliedDate: true,
                },
            },
            jobSkills: {
                include: {
                    skill: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function createJobWithApplication(
    userId: string,
    jobData: Omit<Prisma.JobCreateInput, "user" | "application">
) {
    return await prisma.$transaction(async (tx) => {
        const job = await tx.job.create({
            data: {
                ...jobData,
                user: { connect: { id: userId } },
                application: {
                    create: {
                        user: { connect: { id: userId } },
                        status: "SAVED",
                    },
                },
            },
            include: {
                application: true,
                jobSkills: {
                    include: {
                        skill: true,
                    },
                },
            },
        });

        await tx.activity.create({
            data: {
                applicationId: job.application!.id,
                activityType: "job_created",
                description: `Created job: ${job.title} at ${job.company}`,
            },
        });

        return job;
    });
}

export async function getApplicationStats(userId: string) {
    const stats = await prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
    });

    return stats.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
    }, {} as Record<ApplicationStatus, number>);
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
    return await prisma.$transaction(async (tx) => {
        const previous = await tx.application.findUnique({
            where: { id },
            select: { status: true, job: { select: { title: true, company: true } } },
        });

        const application = await tx.application.update({
            where: { id },
            data: { status },
        });

        await tx.activity.create({
            data: {
                applicationId: id,
                activityType: "status_changed",
                description: `Status changed from ${previous?.status} to ${status}`,
                metadata: {
                    previousStatus: previous?.status,
                    newStatus: status,
                    jobTitle: previous?.job.title,
                    company: previous?.job.company,
                },
            },
        });

        return application;
    });
}

export async function getApplicationTimeline(applicationId: string) {
    return await prisma.activity.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
    });
}

export function buildJobFilters(params: JobFilters & { userId?: string }): Prisma.JobWhereInput {
    const filters: Prisma.JobWhereInput = {};

    if (params.userId) filters.userId = params.userId;
    if (params.title) filters.title = { contains: params.title, mode: "insensitive" };
    if (params.company) filters.company = { contains: params.company, mode: "insensitive" };
    if (params.location) filters.location = { contains: params.location, mode: "insensitive" };
    if (params.workMode) filters.workMode = params.workMode;
    if (params.salaryMin) filters.salaryMin = { gte: params.salaryMin };
    if (params.salaryMax) filters.salaryMax = { lte: params.salaryMax };
    if (params.status) {
        filters.application = {
            status: params.status,
        };
    }

    return filters;
}

export function buildSortOptions(sortBy: string, sortOrder: "asc" | "desc"): Prisma.JobOrderByWithRelationInput {
    return { [sortBy]: sortOrder };
}

export async function getApplicationMetrics(userId: string, dateRange?: DateRange): Promise<ApplicationMetrics> {
    const where: Prisma.ApplicationWhereInput = {
        userId,
        ...(dateRange && {
            createdAt: {
                gte: dateRange.from,
                lte: dateRange.to,
            },
        }),
    };

    const [total, applications, interviews] = await Promise.all([
        prisma.application.count({ where }),
        prisma.application.findMany({
            where,
            select: {
                status: true,
                appliedDate: true,
                createdAt: true,
                interviews: {
                    select: { id: true },
                },
            },
        }),
        prisma.interview.count({
            where: {
                application: { userId },
                ...(dateRange && {
                    createdAt: {
                        gte: dateRange.from,
                        lte: dateRange.to,
                    },
                }),
            },
        }),
    ]);

    const byStatus = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
    }, {} as Record<ApplicationStatus, number>);

    const appliedApplications = applications.filter((a) => a.appliedDate);
    const averageResponseTime =
        appliedApplications.length > 0
            ? appliedApplications.reduce((sum, app) => {
                const diff = app.appliedDate
                    ? new Date().getTime() - new Date(app.appliedDate).getTime()
                    : 0;
                return sum + diff;
            }, 0) / appliedApplications.length
            : 0;

    return {
        total,
        byStatus,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60 * 60 * 24)),
        interviewRate: total > 0 ? interviews / total : 0,
        offerRate: total > 0 ? (byStatus.OFFERED || 0) / total : 0,
    };
}

export async function getSkillsAnalysis(userId: string): Promise<SkillsAnalysis> {
    const [userSkills, jobSkills] = await Promise.all([
        prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
        }),
        prisma.jobSkill.findMany({
            where: {
                job: {
                    userId,
                    application: {
                        status: {
                            in: ["APPLIED", "INTERVIEWING", "OFFERED"],
                        },
                    },
                },
            },
            include: { skill: true },
        }),
    ]);

    const userSkillNames = new Set(userSkills.map((us) => us.skill.name));
    const jobSkillsMap = jobSkills.reduce((acc, js) => {
        const name = js.skill.name;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const jobSkillNames = new Set(Object.keys(jobSkillsMap));
    const matchingSkills = [...userSkillNames].filter((s) => jobSkillNames.has(s));
    const missingSkills = [...jobSkillNames].filter((s) => !userSkillNames.has(s));

    return {
        userSkills: userSkills.map((us) => ({
            name: us.skill.name,
            proficiency: us.proficiencyLevel,
            category: us.skill.category,
        })),
        jobSkills: Object.entries(jobSkillsMap).map(([name, count]) => {
            const skill = jobSkills.find((js) => js.skill.name === name)!.skill;
            return {
                name,
                requiredCount: count,
                category: skill.category,
            };
        }),
        matchingSkills,
        missingSkills,
    };
}
