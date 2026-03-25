"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutGrid, List, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { NoApplicationsYet, NoResults } from "@/components/ui/empty-state";
import { KanbanBoard } from "@/components/applications/KanbanBoard";
import { ListView } from "@/components/applications/ListView";
import { TableView } from "@/components/applications/TableView";
import { SearchAndFilters } from "@/components/applications/SearchAndFilters";
import { JobDialog } from "@/components/jobs/JobDialog";
import { EditApplicationDialog } from "@/components/applications/EditApplicationDialog";
import { useApplicationSearch } from "@/hooks/useApplicationSearch";
import { paramsToFilters } from "@/lib/url-sync";
import type {
    ApplicationCard as ApplicationCardData,
    BoardData,
} from "@/types/application";
import { DEFAULT_FILTERS } from "@/types/application";
import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

type ViewMode = "kanban" | "list" | "table";

// ============================================================================
// Helpers
// ============================================================================

function groupByStatus(applications: ApplicationCardData[]): BoardData {
    const board: BoardData = {
        SAVED: [],
        APPLIED: [],
        REFERRED: [],
        INTERVIEWING: [],
        OFFERED: [],
        REJECTED: [],
    };
    applications.forEach((app) => {
        board[app.status].push(app);
    });
    return board;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ApplicationsBoard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState<ViewMode>("kanban");
    const viewModeInitialized = useRef(false);

    // Load default view from user preferences (once, on first data arrival)
    const { data: profileData } = useQuery({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/users/profile");
            if (!res.ok) throw new Error("Failed");
            return res.json() as Promise<{ user: { preferences: { display?: { defaultView?: ViewMode } } | null } }>;
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!viewModeInitialized.current && profileData) {
            const pref = profileData.user?.preferences?.display?.defaultView;
            if (pref) setViewMode(pref);
            viewModeInitialized.current = true;
        }
    }, [profileData]);

    // Initialise from URL params so browser back/forward works
    const { filters: initialFilters, search: initialSearch } = useMemo(
        () => paramsToFilters(searchParams as unknown as URLSearchParams),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const {
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        applications,
        total: totalApps,
        isLoading,
        isError,
        queryKey,
    } = useApplicationSearch({ initialSearch, initialFilters });

    const [jobDialogOpen, setJobDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Board data (grouped by status) — only needed for kanban view
    const board = useMemo(() => groupByStatus(applications), [applications]);

    // Per-status counts for the filter UI checkboxes
    const applicationCounts = useMemo(() => {
        const counts: Record<ApplicationStatus, number> = {
            SAVED: 0,
            APPLIED: 0,
            REFERRED: 0,
            INTERVIEWING: 0,
            OFFERED: 0,
            REJECTED: 0,
        };
        applications.forEach((app) => {
            counts[app.status] = (counts[app.status] ?? 0) + 1;
        });
        return counts;
    }, [applications]);

    // Whether any real filter (not just sort) is active
    const hasSearchOrFilter =
        searchQuery !== "" ||
        (filters.status?.length ?? 0) > 0 ||
        filters.workMode != null ||
        filters.salaryMin != null ||
        filters.salaryMax != null ||
        !!filters.location ||
        (filters.companies?.length ?? 0) > 0 ||
        filters.dateFrom != null ||
        filters.dateTo != null ||
        filters.hasReferral === true ||
        filters.hasInterview === true;

    const isEmpty = !isLoading && totalApps === 0 && !hasSearchOrFilter;
    const isFilteredEmpty = !isLoading && totalApps === 0 && hasSearchOrFilter;
    const visibleStatuses = filters.status?.length ? filters.status : undefined;

    const handleEdit = (id: string) => setEditingId(id);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ======== Header ======== */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                        Applications
                    </h1>
                    {!isLoading && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {totalApps} application{totalApps !== 1 ? "s" : ""} total
                        </p>
                    )}
                </div>
                <Button onClick={() => setJobDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Job
                </Button>
            </div>

            {/* ======== Search + Filters + View Toggle ======== */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                    <SearchAndFilters
                        onSearch={setSearchQuery}
                        onFilter={setFilters}
                        activeFilters={filters}
                        applicationCounts={applicationCounts}
                    />
                </div>
                <div className="hidden sm:flex items-center border rounded-lg shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-none rounded-l-lg ${viewMode === "kanban" ? "bg-muted" : ""}`}
                        onClick={() => setViewMode("kanban")}
                        aria-label="Kanban view"
                        aria-pressed={viewMode === "kanban"}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-none ${viewMode === "list" ? "bg-muted" : ""}`}
                        onClick={() => setViewMode("list")}
                        aria-label="List view"
                        aria-pressed={viewMode === "list"}
                    >
                        <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-none rounded-r-lg ${viewMode === "table" ? "bg-muted" : ""}`}
                        onClick={() => setViewMode("table")}
                        aria-label="Table view"
                        aria-pressed={viewMode === "table"}
                    >
                        <Table2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* ======== Loading ======== */}
            {isLoading && <BoardSkeleton />}

            {/* ======== Empty States ======== */}
            {isEmpty && (
                <NoApplicationsYet onAction={() => router.push("/jobs/new")} />
            )}
            {isFilteredEmpty && (
                <NoResults
                    onAction={() => {
                        setSearchQuery("");
                        setFilters(DEFAULT_FILTERS);
                    }}
                />
            )}

            {/* ======== Error ======== */}
            {isError && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                    Failed to load applications.{" "}
                    <button
                        onClick={() =>
                            queryClient.invalidateQueries({ queryKey: ["applications"] })
                        }
                        className="text-primary underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ======== Views ======== */}
            {!isLoading && !isError && totalApps > 0 && (
                <>
                    {viewMode === "kanban" && (
                        <KanbanBoard
                            board={board}
                            applications={applications}
                            visibleStatuses={visibleStatuses}
                            queryKey={queryKey}
                        />
                    )}
                    {viewMode === "list" && (
                        <ListView
                            applications={applications}
                            queryKey={queryKey}
                            onEdit={handleEdit}
                        />
                    )}
                    {viewMode === "table" && (
                        <TableView
                            applications={applications}
                            queryKey={queryKey}
                            onEdit={handleEdit}
                        />
                    )}
                </>
            )}

            {/* ======== Job Dialog ======== */}
            <JobDialog
                open={jobDialogOpen}
                onClose={() => setJobDialogOpen(false)}
            />

            {/* ======== Edit Dialog ======== */}
            <EditApplicationDialog
                applicationId={editingId}
                open={!!editingId}
                onClose={() => setEditingId(null)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey })}
            />
        </div>
    );
}

// ============================================================================
// Skeleton
// ============================================================================

export function BoardSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full rounded-xl border bg-muted/30">
                    <div className="flex items-center justify-between p-3 border-b">
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-5 w-6 rounded-md" />
                    </div>
                    <div className="p-2 space-y-2">
                        {Array.from({ length: i % 3 === 0 ? 3 : 2 }).map((_, j) => (
                            <Card key={j}>
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <div className="space-y-1 flex-1">
                                            <Skeleton className="h-3.5 w-24" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-3 w-20" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
