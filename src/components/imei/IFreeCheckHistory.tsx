import { useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ChevronDown,
  Loader2,
  Smartphone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseIfreeResponse, cleanIfreeResponse } from "@/lib/ifree-response-parser";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="rounded-[var(--radius-card)] border border-border/50 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 sm:px-6 py-4 border-b border-border/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
            <History className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-foreground">Check History</h2>
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted-foreground/5" />
          ))}
        </div>
      </div>
    );
  }

  if (checks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-[var(--radius-card)] border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-border/80"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground">Check History</h2>
          <p className="text-[10px] text-muted-foreground/60">
            {checks.length} IMEI lookups{hasNextPage ? "+" : ""}
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="p-4 sm:p-5 space-y-3">
        {checks.map((check, idx) => {
          const isExpanded = expandedId === check.id;
          return (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className={cn(
                "rounded-2xl border bg-secondary/20 overflow-hidden transition-all duration-200",
                isExpanded ? "border-primary/20 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.1)]" : "border-border/30 hover:border-border/60"
              )}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : check.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors hover:bg-secondary/30"
              >
                {/* Status Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  check.success ? "bg-success/10" : "bg-destructive/10"
                )}>
                  {check.success ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {check.service_name || "Unknown Service"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
                      <Smartphone className="w-2.5 h-2.5" />
                      {check.imei}
                    </span>
                  </div>
                </div>

                {/* Right side: status badge + date */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                    check.success
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  )}>
                    {check.success ? "Success" : "Failed"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/50">
                    <Calendar className="w-2.5 h-2.5" />
                    {format(new Date(check.created_at), "MMM d, HH:mm")}
                  </span>
                </div>

                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground/40 shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} />
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-border/20 pt-3">
                      {check.response_text && (() => {
                        const pairs = parseIfreeResponse(check.response_text);
                        return (
                          <div className="relative rounded-xl bg-background/60 border border-border/30 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(cleanIfreeResponse(check.response_text!));
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors z-10"
                              title="Copy"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {pairs.length > 0 ? (
                              <div className="divide-y divide-border/20">
                                {pairs.map((pair, i) =>
                                  pair.key ? (
                                    <div key={i} className="flex items-start px-3.5 py-2.5 gap-3 pr-10">
                                      <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap min-w-[80px] uppercase tracking-wide">
                                        {pair.key}
                                      </span>
                                      <span className="text-[11px] font-mono text-foreground break-all">
                                        {pair.value}
                                      </span>
                                    </div>
                                  ) : (
                                    <div key={i} className="px-3.5 py-2.5 pr-10">
                                      <span className="text-[11px] font-mono text-foreground break-all">
                                        {pair.value}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed p-3.5 pr-10">
                                {cleanIfreeResponse(check.response_text)}
                              </pre>
                            )}
                          </div>
                        );
                      })()}
                      {check.error_message && (
                        <div className="rounded-xl bg-destructive/8 border border-destructive/15 px-3.5 py-2.5">
                          <p className="text-[11px] text-destructive">{check.error_message}</p>
                        </div>
                      )}
                      {check.account_balance && (
                        <p className="text-[10px] text-muted-foreground/60">
                          Balance at time: <span className="font-mono font-bold text-foreground">{check.account_balance}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="px-5 sm:px-6 py-4 border-t border-border/50">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border bg-secondary/30 hover:bg-secondary/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
            ) : (
              "Load older checks"
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
