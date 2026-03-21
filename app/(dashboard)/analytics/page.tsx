import { Suspense } from "react";
import AnalyticsContent from "./AnalyticsContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function AnalyticsPageSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <div className="flex gap-3">
                    <Skeleton className="h-9 w-40" />
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-28" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full rounded-lg" />
                </CardContent>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-56 w-full rounded-lg" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<AnalyticsPageSkeleton />}>
            <AnalyticsContent />
        </Suspense>
    );
}
