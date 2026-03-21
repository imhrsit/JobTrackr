import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// ============================================================================
// Validation
// ============================================================================

const createInterviewSchema = z.object({
    interviewDate: z.string().min(1, "Date is required"),
    interviewType: z.enum([
        "PHONE",
        "VIDEO",
        "ONSITE",
        "TECHNICAL",
        "BEHAVIORAL",
        "HR",
        "FINAL",
    ]),
    interviewerName: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    duration: z.number().optional(),
});

// ============================================================================
// GET /api/applications/[id]/interviews
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        // Verify ownership
        const application = await prisma.application.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const interviews = await prisma.interview.findMany({
            where: { applicationId: id },
            orderBy: { interviewDate: "asc" },
        });

        return NextResponse.json({ interviews });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/applications/[id]/interviews error:", error);
        return NextResponse.json(
            { error: "Failed to fetch interviews" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST /api/applications/[id]/interviews
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();
        const parsed = createInterviewSchema.parse(body);

        // Verify ownership
        const application = await prisma.application.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const interview = await prisma.$transaction(async (tx) => {
            const created = await tx.interview.create({
                data: {
                    applicationId: id,
                    interviewDate: new Date(parsed.interviewDate),
                    interviewType: parsed.interviewType,
                    interviewerName: parsed.interviewerName || null,
                    location: parsed.location || null,
                    notes: parsed.notes || null,
                },
            });

            // Log activity
            await tx.activity.create({
                data: {
                    applicationId: id,
                    activityType: "interview_scheduled",
                    description: `${parsed.interviewType} interview scheduled for ${new Date(parsed.interviewDate).toLocaleDateString()}`,
                    metadata: {
                        interviewId: created.id,
                        interviewType: parsed.interviewType,
                    },
                },
            });

            // Auto-advance status to INTERVIEWING if currently APPLIED or REFERRED
            const app = await tx.application.findUnique({
                where: { id },
                select: { status: true },
            });
            if (
                app &&
                (app.status === "APPLIED" || app.status === "REFERRED")
            ) {
                await tx.application.update({
                    where: { id },
                    data: { status: "INTERVIEWING" },
                });
                await tx.activity.create({
                    data: {
                        applicationId: id,
                        activityType: "status_changed",
                        description: `Status auto-changed to INTERVIEWING`,
                        metadata: {
                            from: app.status,
                            to: "INTERVIEWING",
                        },
                    },
                });
            }

            return created;
        });

        return NextResponse.json({ interview }, { status: 201 });
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
        console.error("POST /api/applications/[id]/interviews error:", error);
        return NextResponse.json(
            { error: "Failed to schedule interview" },
            { status: 500 }
        );
    }
}
