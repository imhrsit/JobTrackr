import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@prisma/client";

const VALID_STATUSES: ApplicationStatus[] = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
];

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();
        const { status } = body as { status: ApplicationStatus };

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        // Verify ownership
        const application = await prisma.application.findFirst({
            where: { id, userId },
        });

        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const updated = await prisma.application.update({
            where: { id },
            data: {
                status,
                appliedDate:
                    status === "APPLIED" && !application.appliedDate
                        ? new Date()
                        : undefined,
            },
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

        // Log activity
        await prisma.activity.create({
            data: {
                applicationId: id,
                activityType: "status_changed",
                description: `Status changed from ${application.status} to ${status}`,
                metadata: {
                    from: application.status,
                    to: status,
                },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        console.error("Update application error:", error);
        return NextResponse.json(
            { error: "Failed to update application" },
            { status: 500 }
        );
    }
}
