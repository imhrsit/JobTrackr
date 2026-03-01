"use client";

import { JobDialog } from "@/components/jobs/JobDialog";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
    const router = useRouter();

    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <JobDialog
                open={true}
                onClose={() => router.push("/applications")}
                onSuccess={() => router.push("/applications")}
            />
        </div>
    );
}
