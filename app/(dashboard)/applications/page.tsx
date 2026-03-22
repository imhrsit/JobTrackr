import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import ApplicationsBoard, { BoardSkeleton } from "./ApplicationsBoard";

export default async function ApplicationsPage() {
    await requireAuth();

    return (
        <Suspense fallback={<BoardSkeleton />}>
            <ApplicationsBoard />
        </Suspense>
    );
}
