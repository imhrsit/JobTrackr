import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// ============================================================================
// Validation
// ============================================================================

const updateInterviewSchema = z.object({
    interviewDate: z.string().optional(),
    interviewType: z
        .enum(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "BEHAVIORAL", "HR", "FINAL"])
        .optional(),
    interviewerName: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    outcome: z.string().nullable().optional(),
    completed: z.boolean().optional(),
});

// ============================================================================
// Helpers
// ============================================================================

async function verifyInterviewOwnership(userId: string, interviewId: string) {
    const interview = await prisma.interview.findFirst({
        where: {
            id: interviewId,
            application: { userId },
        },
        select: { id: true, applicationId: true, interviewType: true },
    });
    return interview;
}

// ============================================================================
// PATCH /api/interviews/[id]
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();
        const parsed = updateInterviewSchema.parse(body);

        const existing = await verifyInterviewOwnership(userId, id);
        if (!existing) {
            return NextResponse.json(
                { error: "Interview not found" },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (parsed.interviewDate !== undefined)
            data.interviewDate = new Date(parsed.interviewDate);
        if (parsed.interviewType !== undefined)
            data.interviewType = parsed.interviewType;
        if (parsed.interviewerName !== undefined)
            data.interviewerName = parsed.interviewerName;
        if (parsed.location !== undefined) data.location = parsed.location;
        if (parsed.notes !== undefined) data.notes = parsed.notes;
        if (parsed.outcome !== undefined) data.outcome = parsed.outcome;
        if (parsed.completed !== undefined) data.completed = parsed.completed;

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.interview.update({
                where: { id },
                data,
            });

            // Log activity
            const changes: string[] = [];
            if (parsed.completed === true) changes.push("Interview marked as completed");
            if (parsed.outcome) changes.push(`Outcome recorded: ${parsed.outcome}`);
            if (parsed.interviewDate) changes.push("Interview rescheduled");

            if (changes.length > 0) {
                await tx.activity.create({
                    data: {
                        applicationId: existing.applicationId,
                        activityType: parsed.completed
                            ? "interview_completed"
                            : "interview_updated",
                        description: changes.join("; "),
                        metadata: {
                            interviewId: id,
                            changes,
                        },
                    },
                });
            }

            return updated;
        });

        return NextResponse.json({ interview: result });
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
        console.error("PATCH /api/interviews/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update interview" },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE /api/interviews/[id]
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        const existing = await verifyInterviewOwnership(userId, id);
        if (!existing) {
            return NextResponse.json(
                { error: "Interview not found" },
                { status: 404 }
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.interview.delete({ where: { id } });
            await tx.activity.create({
                data: {
                    applicationId: existing.applicationId,
                    activityType: "interview_cancelled",
                    description: `${existing.interviewType} interview cancelled`,
                    metadata: { interviewId: id },
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("DELETE /api/interviews/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete interview" },
            { status: 500 }
        );
    }
}
