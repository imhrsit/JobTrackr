import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-utils";

const referralSchema = z.object({
    contactName: z.string().min(1, "Contact name is required"),
    relationship: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    status: z.enum(["NOT_ASKED", "ASKED", "PENDING", "RECEIVED", "DECLINED"]).default("NOT_ASKED"),
    dateAsked: z.string().optional().nullable(),
    followUpDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    response: z.string().optional().nullable(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await requireUserId(request);
        const { id: applicationId } = await params;

        // Verify ownership
        const application = await prisma.application.findFirst({
            where: { id: applicationId, userId },
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const referrals = await prisma.referral.findMany({
            where: { applicationId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(referrals);
    } catch (error) {
        console.error("Error fetching referrals:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await requireUserId(request);
        const { id: applicationId } = await params;

        // Verify ownership
        const application = await prisma.application.findFirst({
            where: { id: applicationId, userId },
            include: { job: true },
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const body = await request.json();
        const data = referralSchema.parse(body);

        const referral = await prisma.$transaction(async (tx) => {
            const newReferral = await tx.referral.create({
                data: {
                    applicationId,
                    contactName: data.contactName,
                    relationship: data.relationship,
                    company: data.company || application.job.company,
                    status: data.status,
                    dateAsked: data.dateAsked ? new Date(data.dateAsked) : null,
                    followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
                    notes: data.notes,
                    response: data.response,
                },
            });

            await tx.activity.create({
                data: {
                    applicationId,
                    activityType: "referral_added",
                    description: `Added referral contact: ${data.contactName}`,
                },
            });

            return newReferral;
        });

        return NextResponse.json(referral, { status: 201 });
    } catch (error) {
        console.error("Error creating referral:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
