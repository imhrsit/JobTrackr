"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                </div>

                {/* Heading */}
                <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
                    Something went wrong
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    An unexpected error occurred. Please try again, or return to the
                    dashboard.
                </p>

                {/* Error digest (always shown — safe, no stack) */}
                {error.digest && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Error ID:{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                            {error.digest}
                        </code>
                    </p>
                )}

                {/* Dev-only details */}
                {process.env.NODE_ENV === "development" && (
                    <details className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-left">
                        <summary className="cursor-pointer select-none text-xs font-medium text-foreground">
                            Error details (dev only)
                        </summary>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                            {error.message}
                            {error.stack ? `\n\n${error.stack}` : ""}
                        </pre>
                    </details>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button onClick={reset} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => (window.location.href = "/dashboard")}
                        className="gap-2"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
