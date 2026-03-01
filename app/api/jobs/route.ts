import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ---- Validation ----

const createJobSchema = z
  .object({
    title: z.string().min(2).max(100),
    company: z.string().min(2).max(100),
    jobUrl: z.string().url().optional().or(z.literal("")),
    location: z.string().max(200).optional().or(z.literal("")),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
    salaryCurrency: z.string().default("USD"),
    salaryMin: z.number().int().positive().optional().nullable(),
    salaryMax: z.number().int().positive().optional().nullable(),
    description: z.string().optional().or(z.literal("")),
    requirements: z.string().optional().or(z.literal("")),
    postedDate: z.string().optional().nullable(),
    status: z
      .enum(["SAVED", "APPLIED", "REFERRED", "INTERVIEWING", "OFFERED", "REJECTED"])
      .default("SAVED"),
    appliedDate: z.string().optional().nullable(),
    resumeVersion: z.string().optional().or(z.literal("")),
    coverLetter: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    skills: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          isRequired: z.boolean().default(true),
        })
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax) return data.salaryMax >= data.salaryMin;
      return true;
    },
    { message: "Max salary must be ≥ min salary", path: ["salaryMax"] }
  );

// ---- GET ----

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const jobs = await prisma.job.findMany({
      where: { userId },
      include: {
        application: {
          select: {
            status: true,
            appliedDate: true,
          },
        },
        jobSkills: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Get jobs error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---- POST ----

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();
    const parsed = createJobSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the job
      const job = await tx.job.create({
        data: {
          userId,
          title: parsed.title,
          company: parsed.company,
          jobUrl: parsed.jobUrl || null,
          location: parsed.location || null,
          workMode: parsed.workMode,
          salaryCurrency: parsed.salaryCurrency,
          salaryMin: parsed.salaryMin ?? null,
          salaryMax: parsed.salaryMax ?? null,
          description: parsed.description || null,
          requirements: parsed.requirements || null,
          postedDate: parsed.postedDate ? new Date(parsed.postedDate) : null,
        },
      });

      // 2. Create the application
      const application = await tx.application.create({
        data: {
          userId,
          jobId: job.id,
          status: parsed.status,
          appliedDate:
            parsed.status !== "SAVED" && parsed.appliedDate
              ? new Date(parsed.appliedDate)
              : parsed.status !== "SAVED"
                ? new Date()
                : null,
          resumeVersion: parsed.resumeVersion || null,
          coverLetter: parsed.coverLetter || null,
          notes: parsed.notes || null,
        },
      });

      // 3. Attach skills (create new ones if needed)
      if (parsed.skills.length > 0) {
        for (const skill of parsed.skills) {
          let skillId = skill.id;

          if (!skillId) {
            // Create or find skill by name
            const existing = await tx.skill.findUnique({
              where: { name: skill.name },
            });
            if (existing) {
              skillId = existing.id;
            } else {
              const created = await tx.skill.create({
                data: { name: skill.name },
              });
              skillId = created.id;
            }
          }

          await tx.jobSkill.create({
            data: {
              jobId: job.id,
              skillId,
              isRequired: skill.isRequired,
            },
          });
        }
      }

      // 4. Log activity
      await tx.activity.create({
        data: {
          applicationId: application.id,
          activityType: "job_created",
          description: `Added ${parsed.title} at ${parsed.company}`,
        },
      });

      return { job, application };
    });

    return NextResponse.json(
      { success: true, job: result.job, application: result.application },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Create job error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
