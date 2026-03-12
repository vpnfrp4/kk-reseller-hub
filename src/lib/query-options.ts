import { keepPreviousData } from "@tanstack/react-query";

/** Shared react-query defaults for fast, resilient queries */
export const FAST_QUERY_OPTIONS = {
  staleTime: 45 * 1000,
  gcTime: 8 * 60 * 1000,
  retry: (failureCount: number, error: Error) => {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("jwt") || message.includes("401") || message.includes("permission") || message.includes("forbidden")) return false;
    return failureCount < 2;
  },
  retryDelay: (attempt: number) => Math.min(800 * attempt, 2500),
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: false,
} as const;

/** For paginated queries — keeps previous data while fetching next page */
export const PAGED_QUERY_OPTIONS = {
  ...FAST_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
} as const;
