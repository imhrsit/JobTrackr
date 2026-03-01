import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Validation
// ============================================================================

const statusUpdateSchema = z.object({
    newStatus: z.enum([
        "SAVED",
        "APPLIED",
        "REFERRED",
        "INTERVIEWING",
        "OFFERED",
        "REJECTED",
    ]),
});

type RouteContext = { params: Promise<{ id: string }> };

// ============================================================================
// PATCH /api/applications/[id]/status
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();

        const { newStatus } = statusUpdateSchema.parse(body);

        // Verify ownership & get current status
        const application = await prisma.application.findFirst({
            where: { id, userId },
            select: { id: true, status: true, appliedDate: true },
        });

        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        // No change needed
        if (application.status === newStatus) {
            return NextResponse.json({
                success: true,
                application,
                message: "Status unchanged",
            });
        }

        // ---- Update status (+ auto-set appliedDate) ----
        const updateData: Record<string, unknown> = { status: newStatus };

        if (
            newStatus !== "SAVED" &&
            !application.appliedDate
        ) {
            updateData.appliedDate = new Date();
        }

        const [updated] = await prisma.$transaction([
            prisma.application.update({
                where: { id },
                data: updateData,
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
            }),
            prisma.activity.create({
                data: {
                    applicationId: id,
                    activityType: "status_changed",
                    description: `Status changed from ${application.status} to ${newStatus}`,
                    metadata: {
                        from: application.status,
                        to: newStatus,
                    },
                },
            }),
        ]);

        return NextResponse.json({ success: true, application: updated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid status", details: error.issues },
                { status: 400 }
            );
        }
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("PATCH /api/applications/[id]/status error:", error);
        return NextResponse.json(
            { error: "Failed to update status" },
            { status: 500 }
        );
    }
}
