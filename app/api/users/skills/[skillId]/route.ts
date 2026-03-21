import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ skillId: string }> };

// ============================================================================
// PATCH /api/users/skills/[skillId] — update proficiency level
// ============================================================================

const updateSchema = z.object({
    proficiencyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { skillId } = await params;
        const body = await request.json();
        const parsed = updateSchema.parse(body);

        const existing = await prisma.userSkill.findUnique({
            where: { userId_skillId: { userId, skillId } },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Skill not found in your profile" },
                { status: 404 }
            );
        }

        const updated = await prisma.userSkill.update({
            where: { userId_skillId: { userId, skillId } },
            data: { proficiencyLevel: parsed.proficiencyLevel },
            include: { skill: true },
        });

        return NextResponse.json({ userSkill: updated });
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
        console.error("PATCH /api/users/skills/[skillId] error:", error);
        return NextResponse.json(
            { error: "Failed to update skill" },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE /api/users/skills/[skillId] — remove skill from profile
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const userId = await requireUserId(request);
        const { skillId } = await params;

        const existing = await prisma.userSkill.findUnique({
            where: { userId_skillId: { userId, skillId } },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Skill not found in your profile" },
                { status: 404 }
            );
        }

        await prisma.userSkill.delete({
            where: { userId_skillId: { userId, skillId } },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("DELETE /api/users/skills/[skillId] error:", error);
        return NextResponse.json(
            { error: "Failed to remove skill" },
            { status: 500 }
        );
    }
}
