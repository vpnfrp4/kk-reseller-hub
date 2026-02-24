import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Activity, ShoppingCart, Wallet, Zap } from "lucide-react";

interface FeedEvent {
  id: string;
  type: "order" | "topup";
  message: string;
  amount: string;
  time: Date;
  isNew?: boolean;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LiveActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const initialized = useRef(false);

  // Seed with recent orders + topups
  const { data: seedData } = useQuery({
    queryKey: ["admin-activity-seed"],
    queryFn: async () => {
      const [orders, topups] = await Promise.all([
        supabase
          .from("orders")
          .select("id, product_name, price, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("wallet_transactions")
          .select("id, amount, type, status, created_at, description")
          .eq("type", "topup")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const orderEvents: FeedEvent[] = (orders.data || []).map((o: any) => ({
        id: o.id,
        type: "order",
        message: `Order: ${o.product_name}`,
        amount: `${Number(o.price).toLocaleString()} MMK`,
        time: new Date(o.created_at),
      }));
      const topupEvents: FeedEvent[] = (topups.data || []).map((t: any) => ({
        id: t.id,
        type: "topup",
        message: `Top-up ${t.status === "approved" ? "approved" : t.status === "pending" ? "requested" : t.status}`,
        amount: `${Number(t.amount).toLocaleString()} MMK`,
        time: new Date(t.created_at),
      }));
      return [...orderEvents, ...topupEvents]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 12);
    },
  });

  useEffect(() => {
    if (seedData && !initialized.current) {
      setEvents(seedData);
      initialized.current = true;
    }
  }, [seedData]);

  // Listen for realtime events
  useEffect(() => {
    const channel = supabase
      .channel("live-activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          const ev: FeedEvent = {
            id: payload.new.id,
            type: "order",
            message: `Order: ${payload.new.product_name || "Unknown"}`,
            amount: `${Number(payload.new.price || 0).toLocaleString()} MMK`,
            time: new Date(),
            isNew: true,
          };
          setEvents((prev) => [ev, ...prev].slice(0, 15));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        (payload: any) => {
          if (payload.new.type !== "topup") return;
          const ev: FeedEvent = {
            id: payload.new.id,
            type: "topup",
            message: "Top-up requested",
            amount: `${Number(payload.new.amount || 0).toLocaleString()} MMK`,
            time: new Date(),
            isNew: true,
          };
          setEvents((prev) => [ev, ...prev].slice(0, 15));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Clear "isNew" flag after animation
  useEffect(() => {
    const newItems = events.filter((e) => e.isNew);
    if (newItems.length === 0) return;
    const timer = setTimeout(() => {
      setEvents((prev) =>
        prev.map((e) => (e.isNew ? { ...e, isNew: false } : e))
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [events]);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Activity className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
          <p className="text-xs text-muted-foreground">Real-time orders and top-ups</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] text-success font-medium uppercase tracking-wider">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Zap className="w-8 h-8 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Waiting for activity...</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
          {events.map((ev, i) => (
            <div
              key={ev.id + i}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                ev.isNew
                  ? "bg-primary/10 border border-primary/20 shadow-[0_0_16px_hsl(43_76%_47%/0.12)]"
                  : "hover:bg-muted/30"
              }`}
            >
              {/* Pulse dot for new items */}
              <div className="relative shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    ev.type === "order"
                      ? "bg-primary/10"
                      : "bg-success/10"
                  }`}
                >
                  {ev.type === "order" ? (
                    <ShoppingCart
                      className="w-3.5 h-3.5 text-primary"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Wallet
                      className="w-3.5 h-3.5 text-success"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                {ev.isNew && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {ev.message}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {timeAgo(ev.time)}
                </p>
              </div>

              <span
                className={`text-xs font-mono font-semibold shrink-0 ${
                  ev.type === "order" ? "text-primary" : "text-success"
                }`}
              >
                {ev.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
