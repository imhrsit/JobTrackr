"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import { filtersToParams } from "@/lib/url-sync";
import type { ApplicationFilters, ApplicationsResponse } from "@/types/application";
import { DEFAULT_FILTERS } from "@/types/application";

// ============================================================================
// Fetcher
// ============================================================================

async function fetchApplications(
    search: string,
    filters: ApplicationFilters
): Promise<ApplicationsResponse> {
    const params = filtersToParams(filters, search);
    const res = await fetch(`/api/applications?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch applications");
    return res.json() as Promise<ApplicationsResponse>;
}

// ============================================================================
// Hook
// ============================================================================

interface UseApplicationSearchOptions {
    initialSearch?: string;
    initialFilters?: ApplicationFilters;
}

export function useApplicationSearch(options: UseApplicationSearchOptions = {}) {
    const { initialSearch = "", initialFilters } = options;

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [filters, setFilters] = useState<ApplicationFilters>(
        initialFilters ?? DEFAULT_FILTERS
    );

    // Debounce search — avoid a query on every keystroke
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Stable query key: changes only when debounced search or filters change
    const queryKey = useMemo(
        () => ["applications", debouncedSearch, JSON.stringify(filters)],
        [debouncedSearch, filters]
    );

    const { data, isLoading, isError, error } = useQuery<ApplicationsResponse>({
        queryKey,
        queryFn: () => fetchApplications(debouncedSearch, filters),
        // Keep previous data visible while new results load (smooth UX)
        placeholderData: (prev) => prev,
    });

    return {
        // State
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        // Data
        applications: data?.applications ?? [],
        total: data?.total ?? 0,
        metadata: data?.metadata,
        // Query state
        isLoading,
        isError,
        error,
        queryKey,
    };
}
