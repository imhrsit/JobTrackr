import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// GET /api/users/skills — list current user's skills
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId(request);

        const userSkills = await prisma.userSkill.findMany({
            where: { userId },
            include: {
                skill: true,
            },
            orderBy: { skill: { name: "asc" } },
        });

        return NextResponse.json({ userSkills });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/users/skills error:", error);
        return NextResponse.json(
            { error: "Failed to fetch user skills" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST /api/users/skills — add a skill to user's profile
// ============================================================================

const addSkillSchema = z.object({
    skillId: z.string().optional(),
    skillName: z.string().min(1).optional(),
    proficiencyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
}).refine(
    (data) => data.skillId || data.skillName,
    { message: "Either skillId or skillName is required" }
);

export async function POST(request: NextRequest) {
    try {
        const userId = await requireUserId(request);
        const body = await request.json();
        const parsed = addSkillSchema.parse(body);

        // Get or create the skill
        let skillId = parsed.skillId;
        if (!skillId && parsed.skillName) {
            const existing = await prisma.skill.findUnique({
                where: { name: parsed.skillName },
            });
            if (existing) {
                skillId = existing.id;
            } else {
                const created = await prisma.skill.create({
                    data: { name: parsed.skillName },
                });
                skillId = created.id;
            }
        }

        if (!skillId) {
            return NextResponse.json(
                { error: "Could not resolve skill" },
                { status: 400 }
            );
        }

        // Check if already exists
        const existingUserSkill = await prisma.userSkill.findUnique({
            where: { userId_skillId: { userId, skillId } },
        });

        if (existingUserSkill) {
            // Update proficiency
            const updated = await prisma.userSkill.update({
                where: { userId_skillId: { userId, skillId } },
                data: { proficiencyLevel: parsed.proficiencyLevel },
                include: { skill: true },
            });
            return NextResponse.json({ userSkill: updated });
        }

        // Create
        const userSkill = await prisma.userSkill.create({
            data: {
                userId,
                skillId,
                proficiencyLevel: parsed.proficiencyLevel,
            },
            include: { skill: true },
        });

        return NextResponse.json({ userSkill }, { status: 201 });
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
        console.error("POST /api/users/skills error:", error);
        return NextResponse.json(
            { error: "Failed to add skill" },
            { status: 500 }
        );
    }
}
