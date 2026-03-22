import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Status colours and labels (single source of truth)
// ============================================================================

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
    SAVED: "#6b7280",
    APPLIED: "#3b82f6",
    REFERRED: "#a855f7",
    INTERVIEWING: "#f59e0b",
    OFFERED: "#22c55e",
    REJECTED: "#ef4444",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    SAVED: "Saved",
    APPLIED: "Applied",
    REFERRED: "Referred",
    INTERVIEWING: "Interviewing",
    OFFERED: "Offered",
    REJECTED: "Rejected",
};

export const ALL_STATUSES: ApplicationStatus[] = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
];

// ============================================================================
// Recharts shared styles
// ============================================================================

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
    borderRadius: "8px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)",
};

// SVG fill/stroke attributes support CSS custom properties directly.
// Do NOT wrap with hsl() — the variables already contain complete color values.
export const AXIS_TICK_STYLE: React.SVGAttributes<SVGTextElement> = {
    fill: "var(--muted-foreground)",
};

export const CHART_GRID_STYLE = {
    strokeDasharray: "3 3",
    stroke: "var(--border)",
    opacity: 0.5,
} as const;

// Funnel stage order (excludes REJECTED which falls outside the funnel)
export const FUNNEL_STATUSES: ApplicationStatus[] = [
    "SAVED",
    "APPLIED",
    "REFERRED",
    "INTERVIEWING",
    "OFFERED",
];
