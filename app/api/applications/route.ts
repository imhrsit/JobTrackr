import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Query validation
// ============================================================================

const querySchema = z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
    salaryMin: z.coerce.number().int().positive().optional(),
    salaryMax: z.coerce.number().int().positive().optional(),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateTo: z.string().datetime({ offset: true }).optional(),
    sortBy: z
        .enum(["createdAt", "appliedDate", "company", "title"])
        .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

const VALID_STATUSES = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
] as const;

// ============================================================================
// GET /api/applications
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId(request);
        const { searchParams } = new URL(request.url);

        // Parse & validate query params
        const raw: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            raw[key] = value;
        });
        const query = querySchema.parse(raw);

        // ---- Build where clause ----
        const where: Prisma.ApplicationWhereInput = { userId };

        // Status filter
        if (query.status && query.status !== "all") {
            const statuses = query.status.split(",");
            const valid = statuses.filter((s) =>
                (VALID_STATUSES as readonly string[]).includes(s)
            );
            if (valid.length > 0) {
                where.status = { in: valid as any };
            }
        }

        // Date range filter
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
        }

        // Job-level filters: search, workMode, salary
        const jobWhere: Prisma.JobWhereInput = {};
        let hasJobFilter = false;

        if (query.search) {
            hasJobFilter = true;
            jobWhere.OR = [
                { title: { contains: query.search, mode: "insensitive" } },
                { company: { contains: query.search, mode: "insensitive" } },
            ];
        }

        if (query.workMode) {
            hasJobFilter = true;
            jobWhere.workMode = query.workMode;
        }

        if (query.salaryMin !== undefined) {
            hasJobFilter = true;
            jobWhere.salaryMax = { gte: query.salaryMin };
        }

        if (query.salaryMax !== undefined) {
            hasJobFilter = true;
            jobWhere.salaryMin = { lte: query.salaryMax };
        }

        if (hasJobFilter) {
            where.job = jobWhere;
        }

        // ---- Sorting ----
        let orderBy: Prisma.ApplicationOrderByWithRelationInput;

        switch (query.sortBy) {
            case "company":
                orderBy = { job: { company: query.sortOrder } };
                break;
            case "title":
                orderBy = { job: { title: query.sortOrder } };
                break;
            case "appliedDate":
                orderBy = { appliedDate: query.sortOrder };
                break;
            default:
                orderBy = { createdAt: query.sortOrder };
        }

        // ---- Pagination ----
        const skip = (query.page - 1) * query.limit;

        // ---- Query ----
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
                orderBy,
                skip,
                take: query.limit,
            }),
            prisma.application.count({ where }),
        ]);

        const pages = Math.ceil(total / query.limit);

        return NextResponse.json({
            applications,
            total,
            metadata: {
                total,
                page: query.page,
                pages,
                limit: query.limit,
                hasMore: query.page < pages,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: error.issues },
                { status: 400 }
            );
        }
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/applications error:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}
