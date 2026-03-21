import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Validation
// ============================================================================

const urlOrEmpty = z
    .string()
    .refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), {
        message: "Must be a valid URL starting with http(s)://",
    })
    .optional()
    .transform((v) => v || null);

const patchSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    phone: z.string().optional().transform((v) => v || null),
    location: z.string().optional().transform((v) => v || null),
    bio: z.string().max(500, "Bio must be under 500 characters").optional().transform((v) => v || null),
    linkedinUrl: urlOrEmpty,
    githubUrl: urlOrEmpty,
    portfolioUrl: urlOrEmpty,
    image: z
        .string()
        .optional()
        .superRefine((v, ctx) => {
            if (!v) return;
            if (v.startsWith("data:")) {
                // Validate base64 format
                if (!/^data:image\/(jpeg|png|webp);base64,/.test(v)) {
                    ctx.addIssue({ code: "custom", message: "Image must be JPEG, PNG, or WebP" });
                    return;
                }
                // Rough size check: base64 ≈ 4/3 × raw bytes
                const byteEstimate = (v.length * 3) / 4;
                if (byteEstimate > 2.5 * 1024 * 1024) {
                    ctx.addIssue({ code: "custom", message: "Image must be under 2 MB" });
                }
            } else if (v.startsWith("http")) {
                if (!/^https?:\/\/.+\..+/.test(v)) {
                    ctx.addIssue({ code: "custom", message: "Image must be a valid URL" });
                }
            }
        })
        .transform((v) => v || null),
    preferences: z.record(z.string(), z.unknown()).optional(),
});

const USER_SELECT = {
    id: true,
    email: true,
    name: true,
    phone: true,
    location: true,
    bio: true,
    linkedinUrl: true,
    githubUrl: true,
    portfolioUrl: true,
    image: true,
    preferences: true,
    createdAt: true,
    updatedAt: true,
} as const;

// ============================================================================
// GET /api/users/profile — fresh user data (JWT can be stale)
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId(request);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: USER_SELECT,
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/users/profile error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

// ============================================================================
// PATCH /api/users/profile — update profile fields
// ============================================================================

export async function PATCH(request: NextRequest) {
    try {
        const userId = await requireUserId(request);
        const body = await request.json();
        const parsed = patchSchema.parse(body);

        // For preferences, deep-merge with existing so partial updates work
        let preferencesUpdate: object | undefined = undefined;
        if (parsed.preferences !== undefined) {
            const existing = await prisma.user.findUnique({
                where: { id: userId },
                select: { preferences: true },
            });
            const existingPrefs = (existing?.preferences as object) ?? {};
            preferencesUpdate = { ...existingPrefs, ...parsed.preferences };
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(parsed.name !== undefined && { name: parsed.name }),
                ...(parsed.phone !== undefined && { phone: parsed.phone }),
                ...(parsed.location !== undefined && { location: parsed.location }),
                ...(parsed.bio !== undefined && { bio: parsed.bio }),
                ...(parsed.linkedinUrl !== undefined && { linkedinUrl: parsed.linkedinUrl }),
                ...(parsed.githubUrl !== undefined && { githubUrl: parsed.githubUrl }),
                ...(parsed.portfolioUrl !== undefined && { portfolioUrl: parsed.portfolioUrl }),
                ...(parsed.image !== undefined && { image: parsed.image }),
                ...(preferencesUpdate !== undefined && { preferences: preferencesUpdate }),
            },
            select: USER_SELECT,
        });

        return NextResponse.json({ success: true, user: updated });
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
        console.error("PATCH /api/users/profile error:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
