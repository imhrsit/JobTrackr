import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        await requireUserId(request);

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        const skills = await prisma.skill.findMany({
            where: search
                ? { name: { contains: search, mode: "insensitive" } }
                : undefined,
            orderBy: { name: "asc" },
            take: 50,
        });

        return NextResponse.json({ skills });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        console.error("Get skills error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
