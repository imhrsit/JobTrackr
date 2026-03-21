"use client";

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import {
    Search,
    X,
    Filter,
    SlidersHorizontal,
    ArrowUpDown,
    DollarSign,
    Calendar,
    Briefcase,
    Users,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { filtersToParams } from "@/lib/url-sync";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    STATUS_COLUMNS,
    DEFAULT_FILTERS,
    type ApplicationFilters,
    type SortBy,
    type SortOrder,
} from "@/types/application";
import type { ApplicationStatus, WorkMode } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface Props {
    onSearch: (query: string) => void;
    onFilter: (filters: ApplicationFilters) => void;
    activeFilters: ApplicationFilters;
    applicationCounts: Record<ApplicationStatus, number>;
}

// Internal draft shape — keeps strings for controlled inputs
interface Draft {
    statuses: ApplicationStatus[];
    workMode: "ALL" | WorkMode;
    salaryMin: string;
    salaryMax: string;
    datePreset: "7d" | "30d" | "90d" | "all" | "custom";
    dateFrom: string;
    dateTo: string;
    sortBy: SortBy;
    sortOrder: SortOrder;
    hasReferral: boolean;
    hasInterview: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const WORK_MODE_OPTIONS: Array<{ value: "ALL" | WorkMode; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "REMOTE", label: "Remote" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "ONSITE", label: "Onsite" },
];

const SALARY_PRESETS = [
    { label: "$0–50k", min: "", max: "50000" },
    { label: "$50–100k", min: "50000", max: "100000" },
    { label: "$100–150k", min: "100000", max: "150000" },
    { label: "$150k+", min: "150000", max: "" },
] as const;

const DATE_PRESETS: Array<{
    value: Draft["datePreset"];
    label: string;
}> = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "3 months" },
    { value: "all", label: "All time" },
    { value: "custom", label: "Custom" },
];

const SORT_OPTIONS: Array<{
    label: string;
    sortBy: SortBy;
    sortOrder: SortOrder;
}> = [
    { label: "Newest first", sortBy: "createdAt", sortOrder: "desc" },
    { label: "Oldest first", sortBy: "createdAt", sortOrder: "asc" },
    { label: "Applied date (newest)", sortBy: "appliedDate", sortOrder: "desc" },
    { label: "Company A–Z", sortBy: "company", sortOrder: "asc" },
    { label: "Title A–Z", sortBy: "title", sortOrder: "asc" },
    { label: "Salary (high–low)", sortBy: "title", sortOrder: "desc" }, // placeholder — API extension
];

// ============================================================================
// Helpers
// ============================================================================

function datePresetDates(
    preset: Draft["datePreset"],
    customFrom: string,
    customTo: string
): { from: string; to: string } {
    const today = format(new Date(), "yyyy-MM-dd");
    if (preset === "7d") return { from: format(subDays(new Date(), 7), "yyyy-MM-dd"), to: today };
    if (preset === "30d") return { from: format(subDays(new Date(), 30), "yyyy-MM-dd"), to: today };
    if (preset === "90d") return { from: format(subDays(new Date(), 90), "yyyy-MM-dd"), to: today };
    if (preset === "custom") return { from: customFrom, to: customTo };
    return { from: "", to: "" }; // "all"
}

function filtersToDraft(f: ApplicationFilters): Draft {
    let datePreset: Draft["datePreset"] = "all";
    if (f.dateFrom || f.dateTo) datePreset = "custom";

    return {
        statuses: f.status ?? [],
        workMode: f.workMode ?? "ALL",
        salaryMin: f.salaryMin != null ? String(f.salaryMin) : "",
        salaryMax: f.salaryMax != null ? String(f.salaryMax) : "",
        datePreset,
        dateFrom: f.dateFrom ?? "",
        dateTo: f.dateTo ?? "",
        sortBy: f.sortBy ?? "createdAt",
        sortOrder: f.sortOrder ?? "desc",
        hasReferral: f.hasReferral ?? false,
        hasInterview: f.hasInterview ?? false,
    };
}

function draftToFilters(d: Draft): ApplicationFilters {
    const { from, to } = datePresetDates(d.datePreset, d.dateFrom, d.dateTo);
    return {
        status: d.statuses.length ? d.statuses : undefined,
        workMode: d.workMode === "ALL" ? null : d.workMode,
        salaryMin: d.salaryMin ? parseInt(d.salaryMin, 10) : null,
        salaryMax: d.salaryMax ? parseInt(d.salaryMax, 10) : null,
        dateFrom: from || null,
        dateTo: to || null,
        sortBy: d.sortBy,
        sortOrder: d.sortOrder,
        hasReferral: d.hasReferral || undefined,
        hasInterview: d.hasInterview || undefined,
    };
}

function countActiveFilters(f: ApplicationFilters): number {
    return [
        (f.status?.length ?? 0) > 0,
        f.workMode != null,
        f.salaryMin != null || f.salaryMax != null,
        f.dateFrom != null || f.dateTo != null,
        (f.sortBy && f.sortBy !== DEFAULT_FILTERS.sortBy) ||
            (f.sortOrder && f.sortOrder !== DEFAULT_FILTERS.sortOrder),
        f.hasReferral,
        f.hasInterview,
    ].filter(Boolean).length;
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchAndFilters({
    onSearch,
    onFilter,
    activeFilters,
    applicationCounts,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const searchRef = useRef<HTMLInputElement>(null);

    // Search state — independent of filter draft
    const [searchValue, setSearchValue] = useState(
        () => activeFilters.search ?? searchParams.get("search") ?? ""
    );
    const debouncedSearch = useDebounce(searchValue, 500);

    // Popover open state + draft
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => filtersToDraft(activeFilters));

    // Debounced salary for URL (1s) — draft change already shows immediate feedback
    const debouncedSalaryMin = useDebounce(draft.salaryMin, 1000);
    const debouncedSalaryMax = useDebounce(draft.salaryMax, 1000);

    // ── Side-effects ─────────────────────────────────────────────────────────

    // Call onSearch (debounced)
    useEffect(() => {
        onSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    // Sync URL when search or applied filters change
    useEffect(() => {
        const qs = filtersToParams(activeFilters, debouncedSearch).toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, activeFilters]);

    // Cmd/Ctrl + K → focus search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === "Escape" && document.activeElement === searchRef.current) {
                setSearchValue("");
                searchRef.current?.blur();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Reset draft when popover opens (so stale changes are discarded)
    const handleOpenChange = useCallback(
        (next: boolean) => {
            if (next) setDraft(filtersToDraft(activeFilters));
            setOpen(next);
        },
        [activeFilters]
    );

    // ── Draft helpers ─────────────────────────────────────────────────────────

    const set = useCallback(
        <K extends keyof Draft>(key: K, value: Draft[K]) =>
            setDraft((d) => ({ ...d, [key]: value })),
        []
    );

    const toggleStatus = useCallback((s: ApplicationStatus) => {
        setDraft((d) => ({
            ...d,
            statuses: d.statuses.includes(s)
                ? d.statuses.filter((x) => x !== s)
                : [...d.statuses, s],
        }));
    }, []);

    const selectAllStatuses = useCallback(() => {
        setDraft((d) => ({
            ...d,
            statuses:
                d.statuses.length === STATUS_COLUMNS.length
                    ? []
                    : STATUS_COLUMNS.map((c) => c.status),
        }));
    }, []);

    const applySalaryPreset = useCallback(
        (min: string, max: string) => setDraft((d) => ({ ...d, salaryMin: min, salaryMax: max })),
        []
    );

    const applyDatePreset = useCallback(
        (preset: Draft["datePreset"]) => {
            if (preset !== "custom") {
                const { from, to } = datePresetDates(preset, "", "");
                setDraft((d) => ({ ...d, datePreset: preset, dateFrom: from, dateTo: to }));
            } else {
                setDraft((d) => ({ ...d, datePreset: "custom" }));
            }
        },
        []
    );

    // ── Apply / Reset ─────────────────────────────────────────────────────────

    const handleApply = useCallback(() => {
        onFilter(draftToFilters(draft));
        setOpen(false);
    }, [draft, onFilter]);

    const handleReset = useCallback(() => {
        const empty = filtersToDraft(DEFAULT_FILTERS);
        setDraft(empty);
        onFilter(DEFAULT_FILTERS);
        setOpen(false);
    }, [onFilter]);

    // ── Remove individual filter chip ────────────────────────────────────────

    const removeFilter = useCallback(
        (key: keyof ApplicationFilters, value?: ApplicationStatus) => {
            if (key === "status" && value) {
                onFilter({
                    ...activeFilters,
                    status: activeFilters.status?.filter((s) => s !== value),
                });
            } else if (key === "workMode") {
                onFilter({ ...activeFilters, workMode: null });
            } else if (key === "salaryMin" || key === "salaryMax") {
                onFilter({ ...activeFilters, salaryMin: null, salaryMax: null });
            } else if (key === "dateFrom" || key === "dateTo") {
                onFilter({ ...activeFilters, dateFrom: null, dateTo: null });
            } else if (key === "sortBy" || key === "sortOrder") {
                onFilter({
                    ...activeFilters,
                    sortBy: DEFAULT_FILTERS.sortBy,
                    sortOrder: DEFAULT_FILTERS.sortOrder,
                });
            } else {
                onFilter({ ...activeFilters, [key]: undefined });
            }
        },
        [activeFilters, onFilter]
    );

    const clearAll = useCallback(() => {
        setSearchValue("");
        onFilter(DEFAULT_FILTERS);
    }, [onFilter]);

    // ── Derived ───────────────────────────────────────────────────────────────

    const activeFilterCount = useMemo(
        () => countActiveFilters(activeFilters),
        [activeFilters]
    );

    const hasAnyActive = activeFilterCount > 0 || searchValue !== "";

    const currentSortLabel = useMemo(() => {
        const match = SORT_OPTIONS.find(
            (o) =>
                o.sortBy === (activeFilters.sortBy ?? "createdAt") &&
                o.sortOrder === (activeFilters.sortOrder ?? "desc")
        );
        return match?.label ?? "Newest first";
    }, [activeFilters.sortBy, activeFilters.sortOrder]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-2">
            {/* ── Row 1: Search + Filter button ── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={searchRef}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search by job title or company…"
                        className="pl-9 pr-9"
                        aria-label="Search applications"
                    />
                    {searchValue ? (
                        <button
                            onClick={() => setSearchValue("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-mono">
                            <span>⌘</span>K
                        </kbd>
                    )}
                </div>

                {/* Filters popover */}
                <Popover open={open} onOpenChange={handleOpenChange}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 shrink-0"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Filters
                            {activeFilterCount > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="h-5 px-1.5 text-xs ml-0.5"
                                >
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent
                        className="w-[340px] sm:w-[400px] p-0"
                        align="start"
                        side="bottom"
                        sideOffset={6}
                    >
                        {/* Popover header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <p className="text-sm font-semibold flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filters
                            </p>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Close filters"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {/* Status */}
                            <FilterSection
                                icon={<Briefcase className="h-3.5 w-3.5" />}
                                label="Status"
                            >
                                <div className="space-y-0.5 mb-2">
                                    {STATUS_COLUMNS.map((col) => {
                                        const count = applicationCounts[col.status] ?? 0;
                                        const checked = draft.statuses.includes(col.status);
                                        return (
                                            <label
                                                key={col.status}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                                                    checked ? "bg-muted/60" : "hover:bg-muted/40"
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={() => toggleStatus(col.status)}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-0.5 rounded",
                                                            col.bgColor,
                                                            col.color
                                                        )}
                                                    >
                                                        {col.label}
                                                    </span>
                                                </span>
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {count}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllStatuses}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        {draft.statuses.length === STATUS_COLUMNS.length
                                            ? "Clear all"
                                            : "Select all"}
                                    </button>
                                </div>
                            </FilterSection>

                            <Separator />

                            {/* Work Mode */}
                            <FilterSection
                                icon={<Briefcase className="h-3.5 w-3.5" />}
                                label="Work Mode"
                            >
                                <div className="grid grid-cols-4 gap-1.5">
                                    {WORK_MODE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => set("workMode", opt.value)}
                                            className={cn(
                                                "text-xs px-2 py-1.5 rounded-md border transition-colors text-center",
                                                draft.workMode === opt.value
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-border hover:bg-muted"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </FilterSection>

                            <Separator />

                            {/* Salary Range */}
                            <FilterSection
                                icon={<DollarSign className="h-3.5 w-3.5" />}
                                label="Salary Range"
                            >
                                <div className="flex gap-2 mb-2">
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground mb-1 block">
                                            Min
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={draft.salaryMin}
                                            onChange={(e) => set("salaryMin", e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground mb-1 block">
                                            Max
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="∞"
                                            value={draft.salaryMax}
                                            onChange={(e) => set("salaryMax", e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {SALARY_PRESETS.map((p) => {
                                        const active =
                                            draft.salaryMin === p.min &&
                                            draft.salaryMax === p.max;
                                        return (
                                            <button
                                                key={p.label}
                                                onClick={() =>
                                                    active
                                                        ? applySalaryPreset("", "")
                                                        : applySalaryPreset(p.min, p.max)
                                                }
                                                className={cn(
                                                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                                    active
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "border-border hover:bg-muted"
                                                )}
                                            >
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                    {(draft.salaryMin || draft.salaryMax) && (
                                        <button
                                            onClick={() => applySalaryPreset("", "")}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </FilterSection>

                            <Separator />

                            {/* Date Range */}
                            <FilterSection
                                icon={<Calendar className="h-3.5 w-3.5" />}
                                label="Date Added"
                            >
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {DATE_PRESETS.map((p) => (
                                        <button
                                            key={p.value}
                                            onClick={() => applyDatePreset(p.value)}
                                            className={cn(
                                                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                                draft.datePreset === p.value
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-border hover:bg-muted"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {draft.datePreset === "custom" && (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Label className="text-xs text-muted-foreground mb-1 block">
                                                From
                                            </Label>
                                            <Input
                                                type="date"
                                                value={draft.dateFrom}
                                                onChange={(e) => set("dateFrom", e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-xs text-muted-foreground mb-1 block">
                                                To
                                            </Label>
                                            <Input
                                                type="date"
                                                value={draft.dateTo}
                                                onChange={(e) => set("dateTo", e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </FilterSection>

                            <Separator />

                            {/* Sort */}
                            <FilterSection
                                icon={<ArrowUpDown className="h-3.5 w-3.5" />}
                                label="Sort By"
                            >
                                <Select
                                    value={`${draft.sortBy}_${draft.sortOrder}`}
                                    onValueChange={(v) => {
                                        const [by, order] = v.split("_") as [SortBy, SortOrder];
                                        setDraft((d) => ({
                                            ...d,
                                            sortBy: by,
                                            sortOrder: order,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SORT_OPTIONS.map((o) => (
                                            <SelectItem
                                                key={`${o.sortBy}_${o.sortOrder}`}
                                                value={`${o.sortBy}_${o.sortOrder}`}
                                            >
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FilterSection>

                            <Separator />

                            {/* Toggles */}
                            <FilterSection
                                icon={<Users className="h-3.5 w-3.5" />}
                                label="Has"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label
                                            htmlFor="toggle-referral"
                                            className="text-sm cursor-pointer"
                                        >
                                            Has referral
                                        </Label>
                                        <Switch
                                            id="toggle-referral"
                                            checked={draft.hasReferral}
                                            onCheckedChange={(v) => set("hasReferral", v)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label
                                            htmlFor="toggle-interview"
                                            className="text-sm cursor-pointer"
                                        >
                                            Has interview
                                        </Label>
                                        <Switch
                                            id="toggle-interview"
                                            checked={draft.hasInterview}
                                            onCheckedChange={(v) => set("hasInterview", v)}
                                        />
                                    </div>
                                </div>
                            </FilterSection>
                        </div>

                        {/* Popover footer */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Reset
                            </Button>
                            <Button size="sm" onClick={handleApply} className="flex-1 sm:flex-none">
                                Apply Filters
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* ── Row 2: Active filter chips ── */}
            {hasAnyActive && (
                <ActiveChips
                    searchValue={searchValue}
                    activeFilters={activeFilters}
                    onRemoveSearch={() => setSearchValue("")}
                    onRemoveFilter={removeFilter}
                    onClearAll={clearAll}
                />
            )}
        </div>
    );
}

// ============================================================================
// FilterSection — collapsible section inside the popover
// ============================================================================

function FilterSection({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-4 py-3 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                {icon}
                {label}
            </p>
            {children}
        </div>
    );
}

// ============================================================================
// ActiveChips
// ============================================================================

function ActiveChips({
    searchValue,
    activeFilters,
    onRemoveSearch,
    onRemoveFilter,
    onClearAll,
}: {
    searchValue: string;
    activeFilters: ApplicationFilters;
    onRemoveSearch: () => void;
    onRemoveFilter: (key: keyof ApplicationFilters, value?: ApplicationStatus) => void;
    onClearAll: () => void;
}) {
    const statusLabels = Object.fromEntries(
        STATUS_COLUMNS.map((c) => [c.status, c.label])
    );

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Search chip */}
            {searchValue && (
                <FilterChip onRemove={onRemoveSearch}>
                    Search: &ldquo;{searchValue}&rdquo;
                </FilterChip>
            )}

            {/* Status chips */}
            {activeFilters.status?.map((s) => (
                <FilterChip
                    key={s}
                    onRemove={() => onRemoveFilter("status", s)}
                    colorClass={STATUS_COLUMNS.find((c) => c.status === s)?.bgColor}
                >
                    {statusLabels[s]}
                </FilterChip>
            ))}

            {/* Work mode chip */}
            {activeFilters.workMode && (
                <FilterChip onRemove={() => onRemoveFilter("workMode")}>
                    {activeFilters.workMode[0] +
                        activeFilters.workMode.slice(1).toLowerCase()}
                </FilterChip>
            )}

            {/* Salary chip */}
            {(activeFilters.salaryMin != null || activeFilters.salaryMax != null) && (
                <FilterChip onRemove={() => onRemoveFilter("salaryMin")}>
                    Salary:{" "}
                    {activeFilters.salaryMin != null
                        ? `$${(activeFilters.salaryMin / 1000).toFixed(0)}k`
                        : "$0"}{" "}
                    –{" "}
                    {activeFilters.salaryMax != null
                        ? `$${(activeFilters.salaryMax / 1000).toFixed(0)}k`
                        : "∞"}
                </FilterChip>
            )}

            {/* Date chip */}
            {(activeFilters.dateFrom || activeFilters.dateTo) && (
                <FilterChip onRemove={() => onRemoveFilter("dateFrom")}>
                    {activeFilters.dateFrom
                        ? format(new Date(activeFilters.dateFrom), "MMM d")
                        : "Start"}{" "}
                    –{" "}
                    {activeFilters.dateTo
                        ? format(new Date(activeFilters.dateTo), "MMM d")
                        : "Now"}
                </FilterChip>
            )}

            {/* Sort chip (only if non-default) */}
            {activeFilters.sortBy &&
                (activeFilters.sortBy !== DEFAULT_FILTERS.sortBy ||
                    activeFilters.sortOrder !== DEFAULT_FILTERS.sortOrder) && (
                    <FilterChip onRemove={() => onRemoveFilter("sortBy")}>
                        Sort:{" "}
                        {SORT_OPTIONS.find(
                            (o) =>
                                o.sortBy === activeFilters.sortBy &&
                                o.sortOrder === activeFilters.sortOrder
                        )?.label ?? "Custom"}
                    </FilterChip>
                )}

            {/* Has referral */}
            {activeFilters.hasReferral && (
                <FilterChip onRemove={() => onRemoveFilter("hasReferral")}>
                    Has referral
                </FilterChip>
            )}

            {/* Has interview */}
            {activeFilters.hasInterview && (
                <FilterChip onRemove={() => onRemoveFilter("hasInterview")}>
                    Has interview
                </FilterChip>
            )}

            {/* Clear all */}
            <button
                onClick={onClearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
                Clear all
            </button>
        </div>
    );
}

function FilterChip({
    children,
    onRemove,
    colorClass,
}: {
    children: React.ReactNode;
    onRemove: () => void;
    colorClass?: string;
}) {
    return (
        <Badge
            variant="secondary"
            className={cn(
                "gap-1 cursor-pointer h-6 text-xs font-normal pl-2 pr-1.5",
                colorClass
            )}
            onClick={onRemove}
        >
            {children}
            <X className="h-2.5 w-2.5 opacity-60" />
        </Badge>
    );
}
