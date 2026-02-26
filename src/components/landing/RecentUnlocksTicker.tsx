import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TickerItem {
  id: string;
  product_name: string;
  completed_at: string | null;
  created_at: string;
}

export default function RecentUnlocksTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: initialData = [] } = useQuery({
    queryKey: ["landing-recent-unlocks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recent_completions" as any)
        .select("id, product_name, completed_at, created_at")
        .order("completed_at", { ascending: false })
        .limit(12);
      return (data || []) as unknown as TickerItem[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  // Realtime: prepend new completions
  useEffect(() => {
    const channel = supabase
      .channel("landing-unlocks-ticker")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=in.(completed,delivered)",
        },
        (payload) => {
          const o = payload.new as TickerItem;
          setItems((prev) => [o, ...prev.filter((i) => i.id !== o.id)].slice(0, 12));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  // Double the items for seamless infinite scroll
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-border bg-card/60 backdrop-blur-sm">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

      {/* Live label */}
      <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-2.5 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live</span>
      </div>

      {/* Scrolling ticker */}
      <div
        ref={scrollRef}
        className="flex items-center gap-6 py-3 pl-24 animate-ticker whitespace-nowrap"
        style={{
          animationDuration: `${doubled.length * 4}s`,
        }}
      >
        {doubled.map((item, i) => {
          const timeAgo = formatDistanceToNow(
            new Date(item.completed_at || item.created_at),
            { addSuffix: true }
          );
          return (
            <div
              key={`${item.id}-${i}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 shrink-0",
                i < items.length && i === 0 && "border-primary/30 bg-primary/[0.06]"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground max-w-[180px] truncate">
                {item.product_name}
              </span>
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
