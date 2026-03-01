import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Validation schemas
// ============================================================================

const updateApplicationSchema = z.object({
    // Application-level fields
    status: z
        .enum(["SAVED", "APPLIED", "REFERRED", "INTERVIEWING", "OFFERED", "REJECTED"])
        .optional(),
    appliedDate: z.string().datetime({ offset: true }).nullable().optional(),
    resumeVersion: z.string().nullable().optional(),
    coverLetter: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),

    // Job-level fields (nested update)
    job: z
        .object({
            title: z.string().min(2).max(100).optional(),
            company: z.string().min(2).max(100).optional(),
            jobUrl: z.string().url().or(z.literal("")).nullable().optional(),
            location: z.string().max(200).nullable().optional(),
            workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
            salaryCurrency: z.string().optional(),
            salaryMin: z.number().int().positive().nullable().optional(),
            salaryMax: z.number().int().positive().nullable().optional(),
            description: z.string().nullable().optional(),
            requirements: z.string().nullable().optional(),
            postedDate: z.string().datetime({ offset: true }).nullable().optional(),
        })
        .optional(),
});

// ============================================================================
// Helpers
// ============================================================================

type RouteContext = { params: Promise<{ id: string }> };

async function verifyOwnership(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        select: { id: true, jobId: true, status: true },
    });
    return application;
}

// ============================================================================
// GET /api/applications/[id]
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        const application = await prisma.application.findFirst({
            where: { id, userId },
            include: {
                job: {
                    include: {
                        jobSkills: {
                            include: { skill: true },
                        },
                    },
                },
                referrals: {
                    orderBy: { createdAt: "desc" },
                },
                interviews: {
                    orderBy: { interviewDate: "asc" },
                },
                activities: {
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
        });

        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ application });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/applications/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch application" },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH /api/applications/[id]
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();

        const parsed = updateApplicationSchema.parse(body);

        // Verify ownership
        const existing = await verifyOwnership(userId, id);
        if (!existing) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        // ---- Build application update data ----
        const appData: Record<string, unknown> = {};
        if (parsed.status !== undefined) appData.status = parsed.status;
        if (parsed.appliedDate !== undefined)
            appData.appliedDate = parsed.appliedDate
                ? new Date(parsed.appliedDate)
                : null;
        if (parsed.resumeVersion !== undefined)
            appData.resumeVersion = parsed.resumeVersion;
        if (parsed.coverLetter !== undefined)
            appData.coverLetter = parsed.coverLetter;
        if (parsed.notes !== undefined) appData.notes = parsed.notes;

        // Auto-set appliedDate when moving to APPLIED for the first time
        if (
            parsed.status &&
            parsed.status !== "SAVED" &&
            parsed.appliedDate === undefined
        ) {
            const current = await prisma.application.findUnique({
                where: { id },
                select: { appliedDate: true },
            });
            if (!current?.appliedDate) {
                appData.appliedDate = new Date();
            }
        }

        // ---- Transaction: update app + job + log ----
        const result = await prisma.$transaction(async (tx) => {
            // Update application
            const updated = await tx.application.update({
                where: { id },
                data: appData,
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
            });

            // Update related job if needed
            if (parsed.job && Object.keys(parsed.job).length > 0) {
                const jobData: Record<string, unknown> = { ...parsed.job };
                if (parsed.job.postedDate !== undefined) {
                    jobData.postedDate = parsed.job.postedDate
                        ? new Date(parsed.job.postedDate)
                        : null;
                }
                await tx.job.update({
                    where: { id: existing.jobId },
                    data: jobData,
                });
            }

            // Log activity
            const changes: string[] = [];
            if (parsed.status && parsed.status !== existing.status) {
                changes.push(
                    `Status changed from ${existing.status} to ${parsed.status}`
                );
            }
            if (parsed.job?.title) changes.push(`Title updated to "${parsed.job.title}"`);
            if (parsed.job?.company)
                changes.push(`Company updated to "${parsed.job.company}"`);
            if (parsed.notes !== undefined) changes.push("Notes updated");

            if (changes.length > 0) {
                await tx.activity.create({
                    data: {
                        applicationId: id,
                        activityType: parsed.status !== existing.status ? "status_changed" : "application_updated",
                        description: changes.join("; "),
                        metadata: { changes },
                    },
                });
            }

            return updated;
        });

        return NextResponse.json({ success: true, application: result });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("PATCH /api/applications/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update application" },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE /api/applications/[id]
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        // Verify ownership
        const existing = await verifyOwnership(userId, id);
        if (!existing) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        await prisma.$transaction(async (tx) => {
            // Delete application (cascades to referrals, interviews, activities)
            await tx.application.delete({ where: { id } });

            // Delete the job if it has no other references
            // (Job has a 1:1 with Application, so if the application is deleted the job is orphaned)
            const jobStillReferenced = await tx.application.findFirst({
                where: { jobId: existing.jobId },
                select: { id: true },
            });
            if (!jobStillReferenced) {
                // Also cleans up jobSkills via cascade
                await tx.job.delete({ where: { id: existing.jobId } });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("DELETE /api/applications/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete application" },
            { status: 500 }
        );
    }
}
