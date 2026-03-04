import { useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseIfreeResponse, cleanIfreeResponse } from "@/lib/ifree-response-parser";

interface IFreeCheck {
  id: string;
  imei: string;
  service_name: string;
  success: boolean;
  response_text: string | null;
  error_message: string | null;
  account_balance: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function IFreeCheckHistory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["ifree-check-history"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("ifree_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as IFreeCheck[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
  });

  const checks = data?.pages.flat() ?? [];

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted-foreground/10 flex items-center justify-center">
            <History className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-foreground">Check History</h2>
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="px-5 py-6 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-[var(--radius-btn)] bg-muted-foreground/10" />
          ))}
        </div>
      </div>
    );
  }

  if (checks.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground">Check History</h2>
          <p className="text-[10px] text-muted-foreground">
            {checks.length} IMEI lookups{hasNextPage ? "+" : ""}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {checks.map((check) => {
          const isExpanded = expandedId === check.id;
          return (
            <div key={check.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : check.id)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
              >
                {check.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {check.service_name || "Unknown Service"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {check.imei}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  {format(new Date(check.created_at), "MMM d, HH:mm")}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 space-y-2">
                  {check.response_text && (() => {
                    const pairs = parseIfreeResponse(check.response_text);
                    return (
                      <div className="relative rounded-[var(--radius-btn)] bg-secondary/50 border border-border overflow-hidden">
                        <button
                          onClick={() => copyText(cleanIfreeResponse(check.response_text!))}
                          className="absolute top-2 right-2 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors z-10"
                          title="Copy"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {pairs.length > 0 ? (
                          <div className="divide-y divide-border">
                            {pairs.map((pair, i) =>
                              pair.key ? (
                                <div key={i} className="flex items-start px-3 py-2 gap-2 pr-8">
                                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap min-w-[80px]">
                                    {pair.key}
                                  </span>
                                  <span className="text-[11px] font-mono text-foreground break-all">
                                    {pair.value}
                                  </span>
                                </div>
                              ) : (
                                <div key={i} className="px-3 py-2 pr-8">
                                  <span className="text-[11px] font-mono text-foreground break-all">
                                    {pair.value}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed p-3 pr-8">
                            {cleanIfreeResponse(check.response_text)}
                          </pre>
                        )}
                      </div>
                    );
                  })()}
                  {check.error_message && (
                    <div className="rounded-[var(--radius-btn)] bg-destructive/8 border border-destructive/15 px-3 py-2">
                      <p className="text-[11px] text-destructive">{check.error_message}</p>
                    </div>
                  )}
                  {check.account_balance && (
                    <p className="text-[10px] text-muted-foreground">
                      Balance at time: <span className="font-mono font-semibold text-foreground">{check.account_balance}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--radius-btn)] border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
            ) : (
              "Load older checks"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
