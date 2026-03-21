import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardSkeletonProps {
    className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
    return (
        <Card
            className={cn("", className)}
            aria-busy="true"
            aria-label="Loading stat"
        >
            {/* Header: label text + icon circle */}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>

            <CardContent>
                {/* Large number value */}
                <Skeleton className="h-9 w-14 mb-2" />

                {/* Subtitle with optional trend arrow */}
                <div className="flex items-center gap-1.5 mt-1">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </CardContent>
        </Card>
    );
}
