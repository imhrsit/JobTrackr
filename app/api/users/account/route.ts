import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { z } from "zod";

const deleteSchema = z.object({
    confirmation: z.literal("DELETE", { error: 'You must type "DELETE" to confirm' }),
    password: z.string().min(1, "Password is required to delete your account"),
});

// ============================================================================
// DELETE /api/users/account
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        const userId = await requireUserId(request);

        // Parse and validate body
        const body = await request.json().catch(() => ({}));
        const parsed = deleteSchema.parse(body);

        // Re-verify password before destruction
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isValid = await verifyPassword(parsed.password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: "Incorrect password" },
                { status: 403 }
            );
        }

        // All relations use onDelete: Cascade, so a single delete cleans everything
        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true });
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
        console.error("DELETE /api/users/account error:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}
