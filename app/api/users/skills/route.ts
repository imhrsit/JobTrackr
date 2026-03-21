import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ProficiencyLevel } from "@prisma/client";

// Proficiency sort weight — higher = ranked first
const PROFICIENCY_WEIGHT: Record<ProficiencyLevel, number> = {
    EXPERT: 4,
    ADVANCED: 3,
    INTERMEDIATE: 2,
    BEGINNER: 1,
};

// ============================================================================
// GET /api/users/skills — list user's skills sorted by proficiency desc, name asc
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId(request);

        const userSkills = await prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
            orderBy: { skill: { name: "asc" } }, // secondary: alphabetical
        });

        // Primary sort: proficiency descending
        const sorted = [...userSkills].sort(
            (a, b) =>
                PROFICIENCY_WEIGHT[b.proficiencyLevel] -
                PROFICIENCY_WEIGHT[a.proficiencyLevel]
        );

        // Normalise to spec response shape; expose skillId as `id`
        const skills = sorted.map((us) => ({
            id: us.skillId,
            skill: {
                id: us.skill.id,
                name: us.skill.name,
                category: us.skill.category ?? "Other",
            },
            proficiencyLevel: us.proficiencyLevel,
            createdAt: us.createdAt,
        }));

        return NextResponse.json({ skills });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/users/skills error:", error);
        return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
    }
}

// ============================================================================
// POST /api/users/skills — add a skill to the user's profile
// ============================================================================

const PROFICIENCY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

const addSkillSchema = z
    .object({
        skillId: z.string().optional(),
        skillName: z.string().min(1, "Skill name is required").optional(),
        category: z.string().optional(), // required when creating a new skill
        proficiencyLevel: z.enum(PROFICIENCY_LEVELS),
    })
    .refine((d) => d.skillId || d.skillName, {
        message: "Either skillId or skillName is required",
    });

export async function POST(request: NextRequest) {
    try {
        const userId = await requireUserId(request);
        const body = await request.json();
        const parsed = addSkillSchema.parse(body);

        // ── Resolve or create the Skill row ──────────────────────────────────

        let skillId = parsed.skillId;

        if (skillId) {
            // Verify the referenced skill exists
            const exists = await prisma.skill.findUnique({ where: { id: skillId } });
            if (!exists) {
                return NextResponse.json({ error: "Skill not found" }, { status: 404 });
            }
        } else if (parsed.skillName) {
            // Find existing by name (case-insensitive match via unique)
            const existing = await prisma.skill.findFirst({
                where: { name: { equals: parsed.skillName, mode: "insensitive" } },
            });

            if (existing) {
                skillId = existing.id;
            } else {
                // Create a new global skill record
                const created = await prisma.skill.create({
                    data: {
                        name: parsed.skillName,
                        category: parsed.category ?? null,
                    },
                });
                skillId = created.id;
            }
        }

        if (!skillId) {
            return NextResponse.json({ error: "Could not resolve skill" }, { status: 400 });
        }

        // ── Check for duplicate ───────────────────────────────────────────────

        const duplicate = await prisma.userSkill.findUnique({
            where: { userId_skillId: { userId, skillId } },
        });

        if (duplicate) {
            return NextResponse.json(
                { error: "You already have this skill in your profile" },
                { status: 409 }
            );
        }

        // ── Create UserSkill ──────────────────────────────────────────────────

        const userSkill = await prisma.userSkill.create({
            data: { userId, skillId, proficiencyLevel: parsed.proficiencyLevel },
            include: { skill: true },
        });

        const skill = {
            id: userSkill.skillId,
            skill: {
                id: userSkill.skill.id,
                name: userSkill.skill.name,
                category: userSkill.skill.category ?? "Other",
            },
            proficiencyLevel: userSkill.proficiencyLevel,
            createdAt: userSkill.createdAt,
        };

        return NextResponse.json({ success: true, userSkill: skill }, { status: 201 });
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
        return NextResponse.json({ error: "Failed to add skill" }, { status: 500 });
    }
}
