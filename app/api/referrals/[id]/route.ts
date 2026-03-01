import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-utils";

const referralUpdateSchema = z.object({
    contactName: z.string().min(1, "Contact name is required").optional(),
    relationship: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    status: z.enum(["NOT_ASKED", "ASKED", "PENDING", "RECEIVED", "DECLINED"]).optional(),
    dateAsked: z.string().optional().nullable(),
    followUpDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    response: z.string().optional().nullable(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        // Verify ownership
        const existingReferral = await prisma.referral.findFirst({
            where: {
                id,
                application: {
                    userId
                }
            },
            include: { application: true },
        });

        if (!existingReferral) {
            return NextResponse.json({ error: "Referral not found" }, { status: 404 });
        }

        const body = await request.json();
        const data = referralUpdateSchema.parse(body);

        const referral = await prisma.$transaction(async (tx) => {
            const updated = await tx.referral.update({
                where: { id },
                data: {
                    ...(data.contactName && { contactName: data.contactName }),
                    ...(data.relationship !== undefined && { relationship: data.relationship }),
                    ...(data.company !== undefined && { company: data.company }),
                    ...(data.status && { status: data.status }),
                    ...(data.dateAsked !== undefined && { dateAsked: data.dateAsked ? new Date(data.dateAsked) : null }),
                    ...(data.followUpDate !== undefined && { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }),
                    ...(data.notes !== undefined && { notes: data.notes }),
                    ...(data.response !== undefined && { response: data.response }),
                },
            });

            if (data.status && data.status !== existingReferral.status) {
                await tx.activity.create({
                    data: {
                        applicationId: existingReferral.applicationId,
                        activityType: "referral_updated",
                        description: `Updated referral status for ${updated.contactName} to ${data.status.replace("_", " ")}`,
                    },
                });
            }

            return updated;
        });

        return NextResponse.json(referral);
    } catch (error) {
        console.error("Error updating referral:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await requireUserId(request);
        const { id } = await params;

        // Verify ownership
        const existingReferral = await prisma.referral.findFirst({
            where: {
                id,
                application: {
                    userId
                }
            },
        });

        if (!existingReferral) {
            return NextResponse.json({ error: "Referral not found" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.referral.delete({
                where: { id },
            });

            await tx.activity.create({
                data: {
                    applicationId: existingReferral.applicationId,
                    activityType: "referral_deleted",
                    description: `Removed referral contact: ${existingReferral.contactName}`,
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting referral:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
