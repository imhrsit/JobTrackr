import type { ApplicationStatus, WorkMode, InterviewType } from "@prisma/client";

// ============================================================================
// Application Types
// ============================================================================

export interface ApplicationJob {
    id: string;
    title: string;
    company: string;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    workMode: WorkMode;
    jobUrl: string | null;
}

export interface ApplicationCard {
    id: string;
    jobId: string;
    status: ApplicationStatus;
    appliedDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    job: ApplicationJob;
    _count?: {
        interviews: number;
        referrals: number;
    };
}

export interface ApplicationsResponse {
    applications: ApplicationCard[];
    total: number;
}

export interface UpdateStatusPayload {
    applicationId: string;
    status: ApplicationStatus;
}

// ============================================================================
// Board / Column Types
// ============================================================================

export const APPLICATION_STATUSES: ApplicationStatus[] = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
];

export interface StatusColumnConfig {
    status: ApplicationStatus;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

export const STATUS_COLUMNS: StatusColumnConfig[] = [
    {
        status: "SAVED",
        label: "Saved",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-300",
    },
    {
        status: "APPLIED",
        label: "Applied",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300",
    },
    {
        status: "REFERRED",
        label: "Referred",
        color: "text-purple-700",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300",
    },
    {
        status: "INTERVIEWING",
        label: "Interviewing",
        color: "text-amber-700",
        bgColor: "bg-amber-100",
        borderColor: "border-amber-300",
    },
    {
        status: "OFFERED",
        label: "Offered",
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-300",
    },
    {
        status: "REJECTED",
        label: "Rejected",
        color: "text-red-700",
        bgColor: "bg-red-100",
        borderColor: "border-red-300",
    },
];

export type BoardData = Record<ApplicationStatus, ApplicationCard[]>;
