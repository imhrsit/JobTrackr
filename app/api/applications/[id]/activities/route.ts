import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// ============================================================================
// GET /api/applications/[id]/activities — list activities
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

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

        const activities = await prisma.activity.findMany({
            where: { applicationId: id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ activities });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/applications/[id]/activities error:", error);
        return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST /api/applications/[id]/activities — add a manual note
// ============================================================================

const addNoteSchema = z.object({
    description: z.string().min(1, "Note content is required"),
    title: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;
        const body = await request.json();
        const parsed = addNoteSchema.parse(body);

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

        const description = parsed.title
            ? `${parsed.title}: ${parsed.description}`
            : parsed.description;

        const activity = await prisma.activity.create({
            data: {
                applicationId: id,
                activityType: "note_added",
                description,
                metadata: {
                    title: parsed.title || null,
                    content: parsed.description,
                },
            },
        });

        return NextResponse.json({ activity }, { status: 201 });
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
        console.error("POST /api/applications/[id]/activities error:", error);
        return NextResponse.json(
            { error: "Failed to add note" },
            { status: 500 }
        );
    }
}
