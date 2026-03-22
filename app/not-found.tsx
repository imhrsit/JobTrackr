import Link from "next/link";
import { FileSearch, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <FileSearch className="h-8 w-8 text-muted-foreground" />
                </div>

                {/* Status code */}
                <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    404
                </p>

                {/* Heading */}
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                    Page not found
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button asChild className="gap-2">
                        <Link href="/dashboard">
                            <LayoutDashboard className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/applications">View Applications</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
