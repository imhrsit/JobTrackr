"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Search,
    Filter,
    X,
    LayoutGrid,
    List,
    Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { NoApplicationsYet, NoResults } from "@/components/ui/empty-state";
import { STATUS_CONFIG } from "@/components/applications/KanbanColumn";
import { KanbanBoard } from "@/components/applications/KanbanBoard";
import type {
    ApplicationCard as ApplicationCardData,
    ApplicationsResponse,
    BoardData,
} from "@/types/application";
import { STATUS_COLUMNS } from "@/types/application";
import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Helpers
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

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

    // State
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(search, 500);
    const [statusFilter, setStatusFilter] = useState<ApplicationStatus[]>(() => {
        const s = searchParams.get("status");
        return s ? (s.split(",") as ApplicationStatus[]) : [];
    });

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
        const qs = params.toString();
        router.replace(`/dashboard/applications${qs ? `?${qs}` : ""}`, {
            scroll: false,
        });
    }, [debouncedSearch, statusFilter, router]);

    // Keyboard shortcut: ESC to clear filters
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && (search || statusFilter.length > 0)) {
                setSearch("");
                setStatusFilter([]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [search, statusFilter]);

    // Query key — shared with KanbanBoard for optimistic updates
    const applicationsQueryKey = useMemo(
        () => ["applications", debouncedSearch, statusFilter.join(",")],
        [debouncedSearch, statusFilter]
    );

    // Fetch applications
    const { data, isLoading, isError } = useQuery<ApplicationsResponse>({
        queryKey: applicationsQueryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (statusFilter.length > 0)
                params.set("status", statusFilter.join(","));
            const res = await fetch(`/api/applications?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch applications");
            return res.json() as Promise<ApplicationsResponse>;
        },
    });

    // Board data (grouped by status)
    const board = useMemo(
        () => groupByStatus(data?.applications ?? []),
        [data?.applications]
    );

    // Filter helpers
    const hasFilters = search !== "" || statusFilter.length > 0;
    const toggleStatusFilter = (s: ApplicationStatus) => {
        setStatusFilter((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    };
    const clearFilters = () => {
        setSearch("");
        setStatusFilter([]);
    };

    const totalApps = data?.total ?? 0;
    const isFiltered = hasFilters;
    const isEmpty = !isLoading && totalApps === 0 && !isFiltered;
    const isFilteredEmpty = !isLoading && totalApps === 0 && isFiltered;

    // Visible statuses (when filtering)
    const visibleStatuses = statusFilter.length > 0 ? statusFilter : undefined;

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
                <Button asChild>
                    <Link href="/dashboard/jobs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Job
                    </Link>
                </Button>
            </div>

            {/* ======== Search + Filters ======== */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title or company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            Filters
                            {statusFilter.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="ml-1 h-5 px-1.5 text-xs"
                                >
                                    {statusFilter.length}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="start">
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Filter by Status</p>
                            {STATUS_COLUMNS.map((col) => (
                                <label
                                    key={col.status}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                    <Checkbox
                                        checked={statusFilter.includes(col.status)}
                                        onCheckedChange={() => toggleStatusFilter(col.status)}
                                    />
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${col.bgColor} ${col.color}`}
                                    >
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* View toggle placeholder */}
                <div className="hidden sm:flex items-center border rounded-lg">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none rounded-l-lg bg-muted"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none"
                    >
                        <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none rounded-r-lg"
                    >
                        <Table2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* ======== Active Filters ======== */}
            {hasFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                    {statusFilter.map((s) => {
                        const config = STATUS_CONFIG[s];
                        return (
                            <Badge
                                key={s}
                                variant="secondary"
                                className="gap-1 cursor-pointer"
                                onClick={() => toggleStatusFilter(s)}
                            >
                                {config.label}
                                <X className="h-3 w-3" />
                            </Badge>
                        );
                    })}
                    {search && (
                        <Badge
                            variant="secondary"
                            className="gap-1 cursor-pointer"
                            onClick={() => setSearch("")}
                        >
                            Search: &quot;{search}&quot;
                            <X className="h-3 w-3" />
                        </Badge>
                    )}
                    <button
                        onClick={clearFilters}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* ======== Loading ======== */}
            {isLoading && <BoardSkeleton />}

            {/* ======== Empty States ======== */}
            {isEmpty && (
                <NoApplicationsYet
                    onAction={() => router.push("/dashboard/jobs/new")}
                />
            )}
            {isFilteredEmpty && <NoResults onAction={clearFilters} />}

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

            {/* ======== Kanban Board ======== */}
            {!isLoading && !isError && totalApps > 0 && (
                <KanbanBoard
                    board={board}
                    applications={data?.applications ?? []}
                    visibleStatuses={visibleStatuses}
                    queryKey={applicationsQueryKey}
                />
            )}
        </div>
    );
}

// ============================================================================
// Skeleton
// ============================================================================

function BoardSkeleton() {
    return (
        <div className="flex gap-4 overflow-hidden pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="min-w-[280px] w-[280px] shrink-0 rounded-xl border bg-muted/30"
                >
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
