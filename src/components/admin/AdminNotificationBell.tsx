import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingCart, AlertTriangle, Clock, ChevronRight, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "admin-bell-read-ids";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  // Keep max 200 entries to avoid unbounded growth
  const arr = [...ids].slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

interface AlertItem {
  id: string;
  type: "order" | "low_balance" | "expiring";
  title: string;
  detail: string;
  time: string;
  link: string;
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);

  // Recent orders (last 24h)
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["bell-recent-orders"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, price, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  // Low balance resellers
  const { data: lowBalance = [] } = useQuery({
    queryKey: ["bell-low-balance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, balance")
        .lt("balance", 5000)
        .order("balance", { ascending: true })
        .limit(3);
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  // Expiring credentials
  const { data: expiring = [] } = useQuery({
    queryKey: ["bell-expiring"],
    queryFn: async () => {
      const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("product_credentials")
        .select("id, expires_at, products(name)")
        .eq("is_sold", false)
        .not("expires_at", "is", null)
        .lte("expires_at", sevenDays)
        .order("expires_at", { ascending: true })
        .limit(3);
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  const alerts: AlertItem[] = useMemo(() => [
    ...recentOrders.map((o: any) => ({
      id: `order-${o.id}`,
      type: "order" as const,
      title: "New Order",
      detail: `${o.product_name} — ${Number(o.price).toLocaleString()} MMK`,
      time: o.created_at,
      link: "/admin/orders",
    })),
    ...lowBalance.map((r: any) => ({
      id: `lb-${r.user_id}`,
      type: "low_balance" as const,
      title: "Low Balance",
      detail: `${r.name || r.email} — ${Number(r.balance).toLocaleString()} MMK`,
      time: "",
      link: "/admin/resellers",
    })),
    ...expiring.map((c: any) => ({
      id: `exp-${c.id}`,
      type: "expiring" as const,
      title: "Expiring Credential",
      detail: `${(c as any).products?.name || "Unknown"} — expires ${formatDistanceToNow(new Date(c.expires_at), { addSuffix: true })}`,
      time: c.expires_at,
      link: "/admin/credentials?status=expiring",
    })),
  ], [recentOrders, lowBalance, expiring]);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    alerts.forEach((a) => next.add(a.id));
    setReadIds(next);
    persistReadIds(next);
  }, [alerts, readIds]);

  const iconMap = {
    order: ShoppingCart,
    low_balance: AlertTriangle,
    expiring: Clock,
  };

  const colorMap = {
    order: "text-success",
    low_balance: "text-warning",
    expiring: "text-destructive",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-card border border-border/60 shadow-xl z-50"
      >
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
              onClick={markAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All clear — no alerts</p>
          ) : (
            alerts.map((a) => {
              const Icon = iconMap[a.type];
              const isRead = readIds.has(a.id);
              return (
                <Link
                  key={a.id}
                  to={a.link}
                  onClick={() => {
                    const next = new Set(readIds);
                    next.add(a.id);
                    setReadIds(next);
                    persistReadIds(next);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/20 last:border-0 group ${isRead ? "opacity-50" : ""}`}
                >
                  <div className={`mt-0.5 ${colorMap[a.type]}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{a.title}</p>
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{a.detail}</p>
                    {a.time && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
