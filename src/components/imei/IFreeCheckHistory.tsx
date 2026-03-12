import { useState, useCallback, useMemo } from "react";
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
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { parseIfreeResponse, cleanIfreeResponse } from "@/lib/ifree-response-parser";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface IFreeCheck {
  id: string;
  imei: string;
  service_name: string;
  service_id: string;
  success: boolean;
  response_text: string | null;
  error_message: string | null;
  account_balance: string | null;
  created_at: string;
}

interface Props {
  onCheckAgain?: (imei: string, serviceId?: string) => void;
}

const PAGE_SIZE = 15;

/** Mask middle digits: 35678901****5678 */
function maskImei(imei: string): string {
  if (imei.length !== 15) return imei;
  return imei.slice(0, 6) + "****" + imei.slice(10);
}

/** Extract a short result summary from response text */
function getResultSummary(check: IFreeCheck): string | null {
  if (!check.success) return check.error_message || "Check failed";
  if (!check.response_text) return null;

  const pairs = parseIfreeResponse(check.response_text);
  if (pairs.length === 0) return null;

  const pairMap = new Map(pairs.map((p) => [p.key.toLowerCase(), p.value]));

  // Try to build a meaningful summary
  const model = pairMap.get("model name") || pairMap.get("model") || pairMap.get("device");
  const lockStatus =
    pairMap.get("simlock") || pairMap.get("sim-lock") || pairMap.get("lock status") || pairMap.get("locked");
  const carrier = pairMap.get("carrier") || pairMap.get("network");

  const parts: string[] = [];
  if (model) parts.push(model);
  if (lockStatus) {
    const isLocked = lockStatus.toLowerCase().includes("lock") && !lockStatus.toLowerCase().includes("unlock");
    parts.push(isLocked ? `[Locked] ${lockStatus}` : `[Unlocked] ${lockStatus}`);
  } else if (carrier) {
    parts.push(carrier);
  }

  if (parts.length > 0) return parts.join(" — ");

  // Fallback: first meaningful pair
  const first = pairs.find((p) => p.key && p.value && p.value.length < 60);
  return first ? `${first.key}: ${first.value}` : null;
}

/** Group checks by date label */
function groupByDate(checks: IFreeCheck[]): { label: string; checks: IFreeCheck[] }[] {
  const groups = new Map<string, IFreeCheck[]>();
  const order: string[] = [];

  for (const check of checks) {
    const date = parseISO(check.created_at);
    let label: string;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else if (isThisWeek(date)) label = "This Week";
    else label = format(date, "MMM d, yyyy");

    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }
    groups.get(label)!.push(check);
  }

  return order.map((label) => ({ label, checks: groups.get(label)! }));
}

export default function IFreeCheckHistory({ onCheckAgain }: Props) {
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
  const dateGroups = useMemo(() => groupByDate(checks), [checks]);

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
            <p className="text-[10px] text-muted-foreground">Loading…</p>
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
            {checks.length} lookup{checks.length !== 1 ? "s" : ""}{hasNextPage ? "+" : ""}
          </p>
        </div>
      </div>

      {/* Grouped List */}
      <div className="divide-y divide-border/30">
        {dateGroups.map((group) => (
          <div key={group.label}>
            {/* Date Group Header */}
            <div className="px-5 sm:px-6 py-2.5 bg-secondary/20 border-b border-border/20">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
                {group.label}
              </span>
            </div>

            {/* Check Items */}
            <div className="divide-y divide-border/15">
              {group.checks.map((check, idx) => {
                const isExpanded = expandedId === check.id;
                const summary = getResultSummary(check);

                return (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className={cn(
                      "transition-colors duration-150",
                      isExpanded ? "bg-primary/[0.02]" : "hover:bg-secondary/20"
                    )}
                  >
                    {/* Row */}
                    <div className="px-4 sm:px-5 py-3 flex items-center gap-3">
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

                      {/* Main Info */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : check.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-bold text-foreground truncate">
                          {check.service_name || "Unknown Service"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
                            <Smartphone className="w-2.5 h-2.5" />
                            {maskImei(check.imei)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">
                            {format(parseISO(check.created_at), "h:mm a")}
                          </span>
                        </div>
                        {summary && (
                          <p className="mt-1 text-[10px] text-muted-foreground/70 truncate max-w-[260px] sm:max-w-[400px]">
                            {summary}
                          </p>
                        )}
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onCheckAgain && (
                          <button
                            onClick={() => onCheckAgain(check.imei, check.service_id)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all duration-150"
                            title="Check again with this IMEI"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : check.id)}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                        >
                          <ChevronDown className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-4 space-y-2">
                            {/* Full IMEI */}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                              <span className="font-semibold uppercase tracking-wide">Full IMEI:</span>
                              <span className="font-mono text-foreground">{check.imei}</span>
                              <button
                                onClick={() => copyText(check.imei)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground/40 hover:text-foreground transition-colors"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Response */}
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
                                    title="Copy result"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  {pairs.length > 0 ? (
                                    <div className="divide-y divide-border/20">
                                      {pairs.map((pair, i) =>
                                        pair.key ? (
                                          <div key={i} className="flex items-start px-3.5 py-2 gap-3 pr-10">
                                            <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap min-w-[80px] uppercase tracking-wide">
                                              {pair.key}
                                            </span>
                                            <span className="text-[11px] font-mono text-foreground break-all">
                                              {pair.value}
                                            </span>
                                          </div>
                                        ) : (
                                          <div key={i} className="px-3.5 py-2 pr-10">
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Pagination Info + Load More */}
      <div className="px-5 sm:px-6 py-3.5 border-t border-border/50 flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
          Showing <span className="font-bold text-muted-foreground">1–{checks.length}</span>{hasNextPage ? "+" : ""} checks
        </span>
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
            ) : (
              "Load more"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
