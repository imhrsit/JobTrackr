import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import ApplicationsBoard from "./ApplicationsBoard";

export default async function ApplicationsPage() {
    await requireAuth();

    return (
        <Suspense>
            <ApplicationsBoard />
        </Suspense>
    );
}
