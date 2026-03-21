import { Skeleton } from "@/components/ui/skeleton";

export function JobDetailsSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            {/* Header: back button + job title + company */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-40" />
                </div>
                {/* Edit / more menu buttons */}
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                </div>
            </div>

            {/* Metadata cards grid (matches 2-col → 5-col responsive grid) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>

            {/* Tab bar */}
            <Skeleton className="h-10 w-full rounded-lg" />

            {/* Tab content area */}
            <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
    );
}
