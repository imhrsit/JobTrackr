import type { ApplicationStatus, WorkMode } from "@prisma/client";
import type { ApplicationFilters, SortBy, SortOrder } from "@/types/application";
import { DEFAULT_FILTERS } from "@/types/application";

// ============================================================================
// filtersToParams
// ============================================================================

/**
 * Serialise an ApplicationFilters object (plus optional search string) into
 * URLSearchParams ready to append to an API request or browser URL.
 */
export function filtersToParams(
    filters: ApplicationFilters,
    search?: string
): URLSearchParams {
    const p = new URLSearchParams();

    if (search) p.set("search", search);
    if (filters.status?.length) p.set("status", filters.status.join(","));
    if (filters.workMode) p.set("workMode", filters.workMode);
    if (filters.salaryMin != null) p.set("salaryMin", String(filters.salaryMin));
    if (filters.salaryMax != null) p.set("salaryMax", String(filters.salaryMax));
    if (filters.location) p.set("location", filters.location);
    if (filters.companies?.length) p.set("companies", filters.companies.join(","));
    if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) p.set("dateTo", filters.dateTo);

    // Only emit sortBy / sortOrder when they differ from defaults
    if (filters.sortBy && filters.sortBy !== DEFAULT_FILTERS.sortBy)
        p.set("sortBy", filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== DEFAULT_FILTERS.sortOrder)
        p.set("sortOrder", filters.sortOrder);

    if (filters.hasReferral) p.set("hasReferral", "1");
    if (filters.hasInterview) p.set("hasInterview", "1");

    return p;
}

// ============================================================================
// paramsToFilters
// ============================================================================

/**
 * Parse URLSearchParams back into { filters, search }.
 * Safe to call with server-side searchParams or client-side URLSearchParams.
 */
export function paramsToFilters(params: URLSearchParams): {
    filters: ApplicationFilters;
    search: string;
} {
    const search = params.get("search") ?? "";

    const statusRaw = params.get("status");
    const companiesRaw = params.get("companies");
    const sortByRaw = params.get("sortBy") as SortBy | null;
    const sortOrderRaw = params.get("sortOrder") as SortOrder | null;

    const salaryMinRaw = params.get("salaryMin");
    const salaryMaxRaw = params.get("salaryMax");

    const filters: ApplicationFilters = {
        ...DEFAULT_FILTERS,
        status: statusRaw
            ? (statusRaw.split(",") as ApplicationStatus[])
            : undefined,
        workMode: (params.get("workMode") as WorkMode) ?? undefined,
        salaryMin: salaryMinRaw != null ? Number(salaryMinRaw) : null,
        salaryMax: salaryMaxRaw != null ? Number(salaryMaxRaw) : null,
        location: params.get("location") ?? undefined,
        companies: companiesRaw ? companiesRaw.split(",") : undefined,
        dateFrom: params.get("dateFrom") ?? null,
        dateTo: params.get("dateTo") ?? null,
        sortBy: sortByRaw ?? DEFAULT_FILTERS.sortBy,
        sortOrder: sortOrderRaw ?? DEFAULT_FILTERS.sortOrder,
        hasReferral: params.get("hasReferral") === "1" || undefined,
        hasInterview: params.get("hasInterview") === "1" || undefined,
    };

    return { filters, search };
}
