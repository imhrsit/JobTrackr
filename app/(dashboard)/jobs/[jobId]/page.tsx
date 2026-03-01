import JobDetailContent from "./JobDetailContent";

export const metadata = {
    title: "Job Details | JobTrackr",
};

export default async function JobDetailPage({
    params,
}: {
    params: Promise<{ jobId: string }>;
}) {
    const { jobId } = await params;

    return <JobDetailContent applicationId={jobId} />;
}
