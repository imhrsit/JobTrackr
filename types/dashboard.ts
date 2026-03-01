import type { ApplicationStatus, InterviewType } from "@prisma/client";

// ============================================================================
// Dashboard API Response Types
// ============================================================================

export interface DashboardStats {
  totalApplications: number;
  totalLastMonth: number;
  activeApplications: number;
  activePercentage: number;
  upcomingInterviews: number;
  nextInterviewDate: string | null;
  offersReceived: number;
  successRate: number;
}

export interface RecentApplication {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  job: {
    title: string;
    company: string;
  };
}

export interface UpcomingInterview {
  id: string;
  interviewDate: string;
  interviewType: InterviewType;
  interviewerName: string | null;
  location: string | null;
  application: {
    id: string;
    job: {
      title: string;
      company: string;
    };
  };
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface TopSkill {
  name: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentApplications: RecentApplication[];
  upcomingInterviews: UpcomingInterview[];
  chartData: ChartDataPoint[];
  topSkills: TopSkill[];
  responseRate: number;
}
