import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// ============================================================================
// Helpers
// ============================================================================

function toCSV(rows: string[][]): string {
    return rows
        .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
}

const today = () => new Date().toISOString().slice(0, 10);

async function buildExport(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            applications: {
                include: {
                    job: true,
                    interviews: true,
                    referrals: true,
                },
                orderBy: { createdAt: "desc" },
            },
            userSkills: {
                include: { skill: true },
                orderBy: { skill: { name: "asc" } },
            },
        },
    });
    return user;
}

function csvResponse(user: NonNullable<Awaited<ReturnType<typeof buildExport>>>) {
    const headers = [
        "Company", "Title", "Status", "Applied Date",
        "Location", "Work Mode", "Salary Min", "Salary Max", "Currency",
        "Interviews", "Referrals", "Notes",
    ];

    const rows = user.applications.map((app) => [
        app.job.company,
        app.job.title,
        app.status,
        app.appliedDate ? new Date(app.appliedDate).toISOString().slice(0, 10) : "",
        app.job.location ?? "",
        app.job.workMode,
        String(app.job.salaryMin ?? ""),
        String(app.job.salaryMax ?? ""),
        app.job.salaryCurrency,
        String(app.interviews.length),
        String(app.referrals.length),
        app.notes ?? "",
    ]);

    const csv = toCSV([headers, ...rows]);

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="jobtrackr-applications-${today()}.csv"`,
        },
    });
}

function jsonResponse(user: NonNullable<Awaited<ReturnType<typeof buildExport>>>) {
    // Structured export with sections — omit password
    const payload = {
        exportedAt: new Date().toISOString(),
        profile: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            location: user.location,
            bio: user.bio,
            linkedinUrl: user.linkedinUrl,
            githubUrl: user.githubUrl,
            portfolioUrl: user.portfolioUrl,
            createdAt: user.createdAt,
        },
        applications: user.applications.map((app) => ({
            id: app.id,
            status: app.status,
            appliedDate: app.appliedDate,
            notes: app.notes,
            createdAt: app.createdAt,
            job: app.job,
            interviews: app.interviews,
            referrals: app.referrals,
        })),
        skills: user.userSkills.map((us) => ({
            name: us.skill.name,
            category: us.skill.category,
            proficiencyLevel: us.proficiencyLevel,
        })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="jobtrackr-export-${today()}.json"`,
        },
    });
}

// ============================================================================
// Shared handler
// ============================================================================

async function handler(request: NextRequest, format: string) {
    try {
        const userId = await requireUserId(request);

        const user = await buildExport(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return format === "csv" ? csvResponse(user) : jsonResponse(user);
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error(`${request.method} /api/users/export error:`, error);
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
    }
}

// ============================================================================
// GET /api/users/export?format=json|csv
// ============================================================================

export async function GET(request: NextRequest) {
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    return handler(request, format);
}

// ============================================================================
// POST /api/users/export?format=json|csv  (spec-compliant alias)
// ============================================================================

export async function POST(request: NextRequest) {
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    return handler(request, format);
}
