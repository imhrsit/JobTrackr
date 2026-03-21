import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
    return (
        <div
            className={cn("w-full overflow-hidden rounded-md border", className)}
            aria-busy="true"
            aria-live="polite"
        >
            {/* Header row */}
            <div className="border-b bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className={cn(
                                "h-4",
                                i === 0 ? "w-[30%]" : "flex-1"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Data rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className={cn(
                        "border-b px-4 py-3 last:border-b-0",
                        rowIdx % 2 === 1 && "bg-muted/20"
                    )}
                >
                    <div className="flex items-center gap-4">
                        {Array.from({ length: columns }).map((_, colIdx) => (
                            <Skeleton
                                key={colIdx}
                                className={cn(
                                    "h-4",
                                    colIdx === 0 ? "w-[30%]" : "flex-1",
                                    colIdx === columns - 1 && "max-w-[80px] ml-auto"
                                )}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
