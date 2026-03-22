import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ─── Response shape ────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
    success: false;
    error: string;
    details?: unknown;
}

function json(body: ApiErrorResponse, status: number) {
    return NextResponse.json(body, { status });
}

// ─── Handler ───────────────────────────────────────────────────────────────────

/**
 * Centralised API error handler.
 *
 * Covers:
 *  - Zod validation errors               → 400
 *  - Unauthorised (requireUserId throws) → 401
 *  - Prisma unique constraint (P2002)    → 409
 *  - Prisma record not found  (P2025)    → 404
 *  - Prisma foreign key error (P2003)    → 400
 *  - Everything else                     → 500
 *
 * Usage:
 *   } catch (error) {
 *     return handleApiError(error, "POST /api/applications");
 *   }
 */
export function handleApiError(
    error: unknown,
    context?: string
): NextResponse<ApiErrorResponse> {
    // ── 400: Zod validation ──────────────────────────────────────────────────
    if (error instanceof z.ZodError) {
        return json(
            {
                success: false,
                error: "Validation error",
                details: error.issues,
            },
            400
        );
    }

    // ── 401: Unauthorised ────────────────────────────────────────────────────
    // requireUserId() throws new Error("Unauthorized: …")
    if (
        error instanceof Error &&
        error.message.includes("Unauthorized")
    ) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }

    // ── Prisma-specific errors ───────────────────────────────────────────────
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            // Unique constraint violation
            case "P2002": {
                const fields = Array.isArray(error.meta?.target)
                    ? (error.meta.target as string[]).join(", ")
                    : "field";
                return json(
                    {
                        success: false,
                        error: `A record with this ${fields} already exists`,
                    },
                    409
                );
            }

            // Record not found (e.g. update/delete on non-existent row)
            case "P2025":
                return json({ success: false, error: "Record not found" }, 404);

            // Foreign key constraint failed
            case "P2003":
                return json(
                    { success: false, error: "Related record not found" },
                    400
                );

            default:
                // Fall through to 500 below
                break;
        }
    }

    // ── 500: Generic fallback ────────────────────────────────────────────────
    const label = context ? `${context} error` : "API error";
    console.error(`[${label}]`, error);

    return json(
        {
            success: false,
            error: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details:
                    error instanceof Error ? error.message : String(error),
            }),
        },
        500
    );
}
