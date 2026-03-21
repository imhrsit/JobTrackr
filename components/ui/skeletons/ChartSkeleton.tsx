import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
    height?: number;
    className?: string;
}

export function ChartSkeleton({ height = 300, className }: ChartSkeletonProps) {
    return (
        <div
            className={cn("relative w-full overflow-hidden rounded-lg", className)}
            style={{ height }}
            aria-busy="true"
            aria-label="Loading chart"
        >
            {/* Main chart area */}
            <Skeleton className="h-full w-full rounded-lg" />

            {/* Fake bar shapes to hint at chart content */}
            <div className="absolute inset-0 flex items-end gap-2 px-8 pb-8 pointer-events-none">
                {[55, 75, 45, 90, 60, 80, 50].map((pct, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-primary/5"
                        style={{ height: `${pct}%` }}
                    />
                ))}
            </div>

            {/* Fake x-axis line */}
            <div className="absolute bottom-8 left-8 right-8 h-px bg-border/50" />

            {/* Fake y-axis line */}
            <div className="absolute bottom-8 left-8 top-4 w-px bg-border/50" />
        </div>
    );
}
