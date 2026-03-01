import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId(request);
        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search") || undefined;
        const status = searchParams.get("status") || undefined;
        const workMode = searchParams.get("workMode") || undefined;

        // Build where clause
        const where: Record<string, unknown> = { userId };

        if (status) {
            const statuses = status.split(",") as ApplicationStatus[];
            where.status = { in: statuses };
        }

        if (search || workMode) {
            where.job = {};
            if (search) {
                (where.job as Record<string, unknown>).OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    { company: { contains: search, mode: "insensitive" } },
                ];
            }
            if (workMode) {
                (where.job as Record<string, unknown>).workMode = workMode;
            }
        }

        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where,
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            company: true,
                            location: true,
                            salaryMin: true,
                            salaryMax: true,
                            salaryCurrency: true,
                            workMode: true,
                            jobUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            interviews: true,
                            referrals: true,
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.application.count({ where }),
        ]);

        return NextResponse.json({ applications, total });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        console.error("Get applications error:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}
