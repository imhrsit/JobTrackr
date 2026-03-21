import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ApplicationCardSkeletonProps {
    className?: string;
}

export function ApplicationCardSkeleton({ className }: ApplicationCardSkeletonProps) {
    return (
        <Card
            className={cn("", className)}
            aria-busy="true"
            aria-label="Loading application"
        >
            <CardContent className="p-3 space-y-2">
                {/* Row 1: Header — drag handle + logo + title/company + menu */}
                <div className="flex items-start gap-2">
                    {/* Drag handle spacer */}
                    <div className="mt-1 h-4 w-4 shrink-0" />

                    {/* Company logo */}
                    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />

                    {/* Title + company */}
                    <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>

                    {/* Menu button spacer */}
                    <div className="h-7 w-7 shrink-0" />
                </div>

                {/* Row 2: Location / work-mode / salary badges */}
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                </div>

                {/* Row 3: Applied date + referral/interview counts */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-10" />
                </div>

                {/* Row 4: Action icons — preserves card height (matches opacity-0 row) */}
                <div className="flex items-center gap-1 pt-0.5">
                    <div className="h-6 w-6" />
                    <div className="h-6 w-6" />
                    <div className="h-6 w-6" />
                </div>
            </CardContent>
        </Card>
    );
}
