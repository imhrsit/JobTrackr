/**
 * Seed script for JobTrackr development database
 * Idempotent - can be run multiple times safely
 * 
 * Run with: npm run db:seed
 */

import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const skillsData = [
    // Programming Languages
    { name: "JavaScript", category: "Programming" },
    { name: "TypeScript", category: "Programming" },
    { name: "Python", category: "Programming" },
    { name: "Java", category: "Programming" },
    { name: "C++", category: "Programming" },
    { name: "C#", category: "Programming" },
    { name: "Go", category: "Programming" },
    { name: "Rust", category: "Programming" },
    { name: "PHP", category: "Programming" },
    { name: "Ruby", category: "Programming" },
    { name: "Swift", category: "Programming" },
    { name: "Kotlin", category: "Programming" },

    // Frontend Frameworks & Libraries
    { name: "React", category: "Frontend" },
    { name: "Next.js", category: "Frontend" },
    { name: "Vue.js", category: "Frontend" },
    { name: "Angular", category: "Frontend" },
    { name: "Svelte", category: "Frontend" },
    { name: "HTML", category: "Frontend" },
    { name: "CSS", category: "Frontend" },
    { name: "Tailwind CSS", category: "Frontend" },
    { name: "Redux", category: "Frontend" },
    { name: "Webpack", category: "Frontend" },

    // Backend Frameworks
    { name: "Node.js", category: "Backend" },
    { name: "Express.js", category: "Backend" },
    { name: "NestJS", category: "Backend" },
    { name: "Django", category: "Backend" },
    { name: "Flask", category: "Backend" },
    { name: "FastAPI", category: "Backend" },
    { name: "Spring Boot", category: "Backend" },
    { name: "Laravel", category: "Backend" },
    { name: "Ruby on Rails", category: "Backend" },
    { name: "ASP.NET", category: "Backend" },

    // Databases
    { name: "PostgreSQL", category: "Databases" },
    { name: "MySQL", category: "Databases" },
    { name: "MongoDB", category: "Databases" },
    { name: "Redis", category: "Databases" },
    { name: "SQLite", category: "Databases" },
    { name: "DynamoDB", category: "Databases" },
    { name: "Elasticsearch", category: "Databases" },
    { name: "Cassandra", category: "Databases" },

    // DevOps & Cloud
    { name: "Docker", category: "DevOps" },
    { name: "Kubernetes", category: "DevOps" },
    { name: "AWS", category: "DevOps" },
    { name: "Azure", category: "DevOps" },
    { name: "Google Cloud", category: "DevOps" },
    { name: "CI/CD", category: "DevOps" },
    { name: "Jenkins", category: "DevOps" },
    { name: "GitHub Actions", category: "DevOps" },
    { name: "Terraform", category: "DevOps" },
    { name: "Ansible", category: "DevOps" },

    // Tools & Version Control
    { name: "Git", category: "Tools" },
    { name: "GitHub", category: "Tools" },
    { name: "GitLab", category: "Tools" },
    { name: "Jira", category: "Tools" },
    { name: "VS Code", category: "Tools" },
    { name: "Postman", category: "Tools" },
    { name: "Figma", category: "Tools" },

    // Testing
    { name: "Jest", category: "Testing" },
    { name: "Cypress", category: "Testing" },
    { name: "Selenium", category: "Testing" },
    { name: "Pytest", category: "Testing" },
    { name: "JUnit", category: "Testing" },

    // Soft Skills
    { name: "Communication", category: "Soft Skills" },
    { name: "Leadership", category: "Soft Skills" },
    { name: "Problem Solving", category: "Soft Skills" },
    { name: "Team Collaboration", category: "Soft Skills" },
    { name: "Time Management", category: "Soft Skills" },
    { name: "Critical Thinking", category: "Soft Skills" },
    { name: "Adaptability", category: "Soft Skills" },
    { name: "Project Management", category: "Soft Skills" },
];

async function main() {
    console.log("🌱 Seeding database...");

    // Create test user (idempotent)
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = await prisma.user.upsert({
        where: { email: "demo@jobtrackr.com" },
        update: {},
        create: {
            email: "demo@jobtrackr.com",
            name: "Demo User",
            password: hashedPassword,
            emailVerified: new Date(),
        },
    });

    console.log("✅ Created demo user:", user.email);

    // Seed skills (idempotent)
    console.log(`📚 Seeding ${skillsData.length} skills...`);

    for (const skillData of skillsData) {
        await prisma.skill.upsert({
            where: { name: skillData.name },
            update: { category: skillData.category },
            create: skillData,
        });
    }

    console.log(`✅ Seeded ${skillsData.length} skills`);

    // Get created skills for relationships
    const react = await prisma.skill.findUnique({ where: { name: "React" } });
    const typescript = await prisma.skill.findUnique({ where: { name: "TypeScript" } });
    const nextjs = await prisma.skill.findUnique({ where: { name: "Next.js" } });
    const nodejs = await prisma.skill.findUnique({ where: { name: "Node.js" } });

    if (!react || !typescript || !nextjs || !nodejs) {
        throw new Error("Required skills not found");
    }

    // Add user skills (idempotent with composite key)
    const userSkillsData = [
        { userId: user.id, skillId: react.id, proficiencyLevel: "EXPERT" as const },
        { userId: user.id, skillId: typescript.id, proficiencyLevel: "ADVANCED" as const },
        { userId: user.id, skillId: nextjs.id, proficiencyLevel: "ADVANCED" as const },
        { userId: user.id, skillId: nodejs.id, proficiencyLevel: "INTERMEDIATE" as const },
    ];

    for (const userSkill of userSkillsData) {
        await prisma.userSkill.upsert({
            where: {
                userId_skillId: {
                    userId: userSkill.userId,
                    skillId: userSkill.skillId,
                },
            },
            update: { proficiencyLevel: userSkill.proficiencyLevel },
            create: userSkill,
        });
    }

    console.log("✅ Added user skills");

    // Check if sample jobs already exist
    const existingJobs = await prisma.job.count({ where: { userId: user.id } });

    if (existingJobs === 0) {
        // Create sample jobs and applications
        await prisma.job.create({
            data: {
                userId: user.id,
                title: "Senior Frontend Developer",
                company: "TechCorp Inc.",
                location: "San Francisco, CA",
                salaryMin: 120000,
                salaryMax: 160000,
                workMode: "HYBRID",
                jobUrl: "https://example.com/job/1",
                description: "We're looking for an experienced Frontend Developer to join our team...",
                requirements: "5+ years React experience, TypeScript proficiency, Next.js knowledge...",
                postedDate: new Date("2026-01-15"),
                application: {
                    create: {
                        userId: user.id,
                        status: "APPLIED",
                        appliedDate: new Date("2026-01-16"),
                        resumeVersion: "v2024-senior",
                        notes: "Good culture fit, strong engineering team",
                    },
                },
                jobSkills: {
                    create: [
                        { skillId: react.id, isRequired: true },
                        { skillId: typescript.id, isRequired: true },
                    ],
                },
            },
        });

        await prisma.job.create({
            data: {
                userId: user.id,
                title: "Full Stack Engineer",
                company: "StartupXYZ",
                location: "Remote",
                salaryMin: 100000,
                salaryMax: 140000,
                workMode: "REMOTE",
                jobUrl: "https://example.com/job/2",
                description: "Join our fast-paced startup to build the future of tech...",
                postedDate: new Date("2026-01-18"),
                application: {
                    create: {
                        userId: user.id,
                        status: "INTERVIEWING",
                        appliedDate: new Date("2026-01-19"),
                        resumeVersion: "v2024-fullstack",
                        interviews: {
                            create: [
                                {
                                    interviewDate: new Date("2026-01-25T14:00:00Z"),
                                    interviewType: "TECHNICAL",
                                    interviewerName: "John Doe",
                                    location: "Zoom meeting",
                                    completed: false,
                                    notes: "Prepare for React hooks and system design questions",
                                },
                            ],
                        },
                    },
                },
                jobSkills: {
                    create: [
                        { skillId: react.id, isRequired: true },
                        { skillId: nodejs.id, isRequired: true },
                    ],
                },
            },
        });

        console.log("✅ Created 2 sample jobs with applications");
    } else {
        console.log("⏭️  Sample jobs already exist, skipping...");
    }

    console.log("\n🎉 Seeding completed!");
    console.log("\n📝 Demo credentials:");
    console.log("   Email: demo@jobtrackr.com");
    console.log("   Password: password123");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
