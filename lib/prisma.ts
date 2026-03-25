import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env, isDevelopment } from "./env";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: Pool | undefined;
};

// Use DIRECT_URL (non-pooler) so Prisma interactive transactions work.
// Neon's pooler (PgBouncer) runs in transaction mode and doesn't support
// interactive transactions, causing P2028 errors.
const pool = globalForPrisma.pool ?? new Pool({
    connectionString: env.DIRECT_URL ?? env.DATABASE_URL,
});

if (isDevelopment) {
    globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: isDevelopment
            ? ["query", "error", "warn"]
            : ["error"],
        errorFormat: isDevelopment ? "pretty" : "minimal",
    });

if (isDevelopment) {
    globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma() {
    await prisma.$disconnect();
}

export async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        return false;
    }
}

if (typeof window === "undefined") {
    process.on("beforeExit", async () => {
        await disconnectPrisma();
    });
}

export type { PrismaClient } from ".prisma/client";
export * from ".prisma/client";
