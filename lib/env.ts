import { z } from "zod";

/**
 * Environment variable schema validation
 * Validates all required environment variables at build/runtime
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required")
        .url("DATABASE_URL must be a valid URL"),

    // NextAuth
    NEXTAUTH_URL: z
        .string()
        .min(1, "NEXTAUTH_URL is required")
        .url("NEXTAUTH_URL must be a valid URL"),
    NEXTAUTH_SECRET: z
        .string()
        .min(32, "NEXTAUTH_SECRET must be at least 32 characters long"),

    // OAuth (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // App
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
});

/**
 * Validate and parse environment variables
 * Throws a detailed error if validation fails
 */
function validateEnv() {
    try {
        const env = envSchema.parse({
            DATABASE_URL: process.env.DATABASE_URL,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            NODE_ENV: process.env.NODE_ENV,
        });

        return env;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((issue) => {
                const path = issue.path.join(".");
                return `  ❌ ${path}: ${issue.message}`;
            });

            throw new Error(
                `\n❌ Invalid environment variables:\n\n${missingVars.join("\n")}\n\n` +
                `💡 Please check your .env.local file and ensure all required variables are set.\n` +
                `📄 See .env.example for reference.\n`
            );
        }
        throw error;
    }
}

/**
 * Type-safe environment variables
 * Validated on app initialization
 */
export const env = validateEnv();

/**
 * Type definition for environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if we're in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if we're in development
 */
export const isDevelopment = env.NODE_ENV === "development";

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === "test";
