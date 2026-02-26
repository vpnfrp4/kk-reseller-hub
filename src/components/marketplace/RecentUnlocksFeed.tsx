import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

interface FeedItem {
  id: string;
  product_name: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export default function RecentUnlocksFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const { data: initialData = [] } = useQuery({
    queryKey: ["recent-unlocks-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, status, completed_at, created_at")
        .in("status", ["completed", "delivered"])
        .order("completed_at", { ascending: false })
        .limit(8);
      return (data || []) as FeedItem[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  // Realtime subscription for new completions
  useEffect(() => {
    const channel = supabase
      .channel("recent-unlocks")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=in.(completed,delivered)",
        },
        (payload) => {
          const newOrder = payload.new as FeedItem;
          setItems((prev) => {
            const filtered = prev.filter((i) => i.id !== newOrder.id);
            return [newOrder, ...filtered].slice(0, 8);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Recently Completed
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">Live Feed</p>
      </div>

      <div className="divide-y divide-border/10">
        {items.map((item, i) => {
          const timeAgo = formatDistanceToNow(
            new Date(item.completed_at || item.created_at),
            { addSuffix: true }
          );

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-5 py-3 transition-all",
                i === 0 && "animate-fade-in"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.product_name}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {timeAgo}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
