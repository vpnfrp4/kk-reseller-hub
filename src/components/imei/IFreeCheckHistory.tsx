import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

export default function IFreeCheckHistory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ["ifree-check-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ifree_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as IFreeCheck[];
    },
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

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
            Your last {checks.length} IMEI lookups
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
                  {check.response_text && (
                    <div className="relative rounded-[var(--radius-btn)] bg-secondary/50 border border-border p-3">
                      <button
                        onClick={() => copyText(check.response_text!)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed pr-6">
                        {check.response_text}
                      </pre>
                    </div>
                  )}
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
    </div>
  );
}
