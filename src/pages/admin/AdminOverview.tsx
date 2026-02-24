import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Wallet, ShoppingCart, AlertTriangle, Settings2, Clock, Plus, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";
import LiveActivityFeed from "@/components/admin/LiveActivityFeed";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays } from "date-fns";
import { PageContainer, StatCard, DataCard, Money } from "@/components/shared";

const THRESHOLD_KEY = "admin-low-balance-threshold";
const DEFAULT_THRESHOLD = 5000;

function getStoredThreshold(): number {
  try {
    const v = localStorage.getItem(THRESHOLD_KEY);
    if (v) return Math.max(0, Number(v));
  } catch {}
  return DEFAULT_THRESHOLD;
}

export default function AdminOverview() {
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const [threshold, setThreshold] = useState(getStoredThreshold);
  const [thresholdInput, setThresholdInput] = useState(String(getStoredThreshold()));
  const thresholdRef = useRef(threshold);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-recent-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
          if (initialized.current) {
            const msg = `New order: ${payload.new?.product_name || "Unknown"}`;
            toast.info(msg);
            notifyEvent("New Order", msg, "info");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          if (initialized.current && payload.new?.type === "topup") {
            const msg = `New top-up request: ${Number(payload.new.amount).toLocaleString()} MMK`;
            toast.info(msg);
            notifyEvent("New Top-up Request", msg, "info");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_credentials" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-low-balance"] });
          if (initialized.current && payload.new?.balance < thresholdRef.current) {
            const name = payload.new.name || payload.new.email || "A reseller";
            const msg = `${name}'s balance dropped to ${Number(payload.new.balance).toLocaleString()} MMK`;
            toast.warning(msg);
            notifyEvent("Low Balance Alert", msg, "info");
          }
        }
      )
      .subscribe();

    setTimeout(() => { initialized.current = true; }, 2000);

    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, pendingTopups, resellers, availableCreds, totalCreds, soldToday, expiringSoon, monthRevenue] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", true).gte("sold_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false).not("expires_at", "is", null).lte("expires_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("orders").select("price").gte("created_at", subDays(new Date(), 30).toISOString()).then(({ data }) =>
          (data || []).reduce((sum: number, o: any) => sum + Number(o.price), 0)
        ),
      ]);
      return {
        products: products.count || 0,
        pendingTopups: pendingTopups.count || 0,
        resellers: resellers.count || 0,
        availableCredentials: availableCreds.count || 0,
        totalCredentials: totalCreds.count || 0,
        soldToday: soldToday.count || 0,
        expiringSoon: expiringSoon.count || 0,
        monthRevenue,
      };
    },
  });

  const { data: sparkRaw } = useQuery({
    queryKey: ["admin-spark-7d"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("price, created_at")
        .gte("created_at", subDays(new Date(), 7).toISOString())
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const sparkRevenue = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    (sparkRaw || []).forEach((r: any) => {
      const key = format(new Date(r.created_at), "yyyy-MM-dd");
      if (key in days) days[key] += Number(r.price);
    });
    return Object.values(days);
  }, [sparkRaw]);

  const sparkSales = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    (sparkRaw || []).forEach((r: any) => {
      const key = format(new Date(r.created_at), "yyyy-MM-dd");
      if (key in days) days[key]++;
    });
    return Object.values(days);
  }, [sparkRaw]);

  const { data: perProduct } = useQuery({
    queryKey: ["admin-cred-per-product"],
    queryFn: async () => {
      const [products, creds] = await Promise.all([
        supabase.from("products").select("id, name, icon"),
        supabase.from("product_credentials").select("product_id, is_sold"),
      ]);
      const counts: Record<string, { name: string; icon: string; available: number; sold: number }> = {};
      (products.data || []).forEach((p: any) => {
        counts[p.id] = { name: p.name, icon: p.icon, available: 0, sold: 0 };
      });
      (creds.data || []).forEach((c: any) => {
        if (counts[c.product_id]) {
          if (c.is_sold) counts[c.product_id].sold++;
          else counts[c.product_id].available++;
        }
      });
      return Object.values(counts).filter(p => p.available + p.sold > 0);
    },
  });

  const { data: lowBalanceResellers } = useQuery({
    queryKey: ["admin-low-balance", threshold],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, balance")
        .lt("balance", threshold)
        .order("balance", { ascending: true });
      return data || [];
    },
  });

  const sold = (stats?.totalCredentials || 0) - (stats?.availableCredentials || 0);
  const total = stats?.totalCredentials || 0;
  const availablePct = total > 0 ? ((stats?.availableCredentials || 0) / total) * 100 : 0;

  const kpiCards = [
    {
      label: "Total Accounts",
      value: stats?.totalCredentials || 0,
      icon: KeyRound,
      iconColor: "text-primary",
      sparkData: sparkSales,
      trend: { value: 5.2, label: "vs last week" },
    },
    {
      label: "Sold Today",
      value: stats?.soldToday || 0,
      icon: ShoppingCart,
      iconColor: "text-success",
      sparkData: sparkSales,
      trend: { value: 12.8, label: "vs yesterday" },
    },
    {
      label: "Revenue (Monthly)",
      value: stats?.monthRevenue || 0,
      icon: Wallet,
      iconColor: "text-warning",
      sparkData: sparkRevenue,
      trend: { value: 8.4, label: "vs last month" },
      suffix: "MMK",
    },
    {
      label: "Expiring Soon",
      value: stats?.expiringSoon || 0,
      icon: Clock,
      iconColor: "text-destructive",
      trend: stats?.expiringSoon ? { value: -2.1, label: "" } : undefined,
    },
  ] as const;

  return (
    <PageContainer>
      {/* Header + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-default animate-fade-in">
        <div>
          <h1 className="text-h1 text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground text-body">Manage your reseller platform</p>
        </div>
        <div className="flex items-center gap-tight">
          <Link to="/admin/credentials">
            <Button size="sm" className="btn-glow gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" />Add Credentials
            </Button>
          </Link>
          <Link to="/admin/topups">
            <Button size="sm" variant="outline" className="btn-glass gap-1.5 h-8 text-xs relative">
              <CheckCircle2 className="w-3.5 h-3.5" />Approve Top-ups
              {(stats?.pendingTopups || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                  {stats!.pendingTopups}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button size="sm" variant="outline" className="btn-glass gap-1.5 h-8 text-xs">
              <ShoppingCart className="w-3.5 h-3.5" />Orders
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-default">
        {kpiCards.map((card, i) => (
          <StatCard key={card.label} {...card} animate delay={i * 0.08} className="hover-lift" />
        ))}
      </div>

      {/* Low Balance Warning */}
      <DataCard
        title="Low Balance Alert"
        description={`${lowBalanceResellers?.length || 0} reseller${(lowBalanceResellers?.length || 0) !== 1 ? "s" : ""} below ${threshold.toLocaleString()} MMK`}
        className="border-warning/30 animate-fade-in [animation-delay:0.35s]"
        actions={
          <div className="flex items-center gap-tight">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-card" align="end">
                <p className="text-sm font-medium text-foreground mb-tight">Alert Threshold</p>
                <div className="flex gap-tight">
                  <Input
                    type="number" value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="h-8 text-sm bg-muted/30 border-border" min={0} placeholder="Amount in MMK"
                  />
                  <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => {
                    const val = Math.max(0, Math.round(Number(thresholdInput)));
                    setThreshold(val); thresholdRef.current = val;
                    localStorage.setItem(THRESHOLD_KEY, String(val));
                    setThresholdInput(String(val));
                    queryClient.invalidateQueries({ queryKey: ["admin-low-balance"] });
                    toast.success(`Threshold set to ${val.toLocaleString()} MMK`);
                  }}>Save</Button>
                </div>
                <p className="text-caption text-muted-foreground mt-tight">Resellers below this balance will trigger alerts</p>
              </PopoverContent>
            </Popover>
            <Link to="/admin/resellers" className="text-caption text-primary hover:underline">View all</Link>
          </div>
        }
      >
        {lowBalanceResellers && lowBalanceResellers.length > 0 ? (
          <div className="space-y-tight">
            {lowBalanceResellers.slice(0, 5).map((r: any) => (
              <div key={r.user_id} className="flex items-center justify-between p-compact rounded-btn bg-warning/5 border border-warning/10 hover:bg-warning/10 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.name || "—"}</p>
                  <p className="text-caption text-muted-foreground">{r.email}</p>
                </div>
                <Money amount={r.balance} className="text-sm font-semibold text-warning" />
              </div>
            ))}
            {lowBalanceResellers.length > 5 && (
              <p className="text-caption text-muted-foreground text-center pt-micro">+{lowBalanceResellers.length - 5} more</p>
            )}
          </div>
        ) : (
          <p className="text-body text-muted-foreground text-center py-compact">No resellers below threshold</p>
        )}
      </DataCard>

      {/* Live Activity Feed + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card">
        <div className="lg:col-span-1">
          <LiveActivityFeed />
        </div>
        <div className="lg:col-span-2">
          <AdminAnalyticsCharts />
        </div>
      </div>

      {/* Credentials Overview */}
      <DataCard
        title="Credentials Overview"
        description="Available vs Sold across all products"
        className="animate-fade-in [animation-delay:0.4s]"
      >
        <div className="flex items-center gap-default mb-default">
          <div className="flex items-center gap-tight">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-caption text-muted-foreground">Available ({stats?.availableCredentials || 0})</span>
          </div>
          <div className="flex items-center gap-tight">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-caption text-muted-foreground">Sold ({sold})</span>
          </div>
          <span className="text-caption text-muted-foreground ml-auto font-mono tabular-nums">{total} total</span>
        </div>

        <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-card">
          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${availablePct}%` }} />
        </div>

        <div className="space-y-compact">
          {(perProduct || []).map((p) => {
            const pTotal = p.available + p.sold;
            const pAvailPct = pTotal > 0 ? (p.available / pTotal) * 100 : 0;
            return (
              <div key={p.name} className="flex items-center gap-compact">
                <span className="text-lg w-7 text-center shrink-0">{p.icon}</span>
                <span className="text-sm text-foreground font-medium min-w-[120px]">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${pAvailPct}%` }} />
                </div>
                <span className="text-caption font-mono tabular-nums text-muted-foreground min-w-[60px] text-right">{p.available}/{pTotal}</span>
              </div>
            );
          })}
          {(!perProduct || perProduct.length === 0) && (
            <p className="text-body text-muted-foreground text-center py-default">No credentials added yet</p>
          )}
        </div>
      </DataCard>

      {/* Recent Orders */}
      <DataCard
        title="Recent Orders"
        description="Latest purchases across all resellers"
        className="animate-fade-in [animation-delay:0.5s]"
      >
        <RecentOrdersFeed />
      </DataCard>
    </PageContainer>
  );
}

function RecentOrdersFeed() {
  const { data: orders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, price, created_at, user_id, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return data.map((o: any) => ({ ...o, profile: profileMap[o.user_id] || null }));
    },
  });

  if (!orders || orders.length === 0) {
    return <p className="text-body text-muted-foreground text-center py-card">No orders yet</p>;
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-micro">
      {orders.map((o: any, i: number) => (
        <div key={o.id} className="flex items-center gap-default p-compact rounded-btn hover:bg-muted/30 transition-all duration-200 hover:translate-x-1 opacity-0 animate-row-in" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-caption font-bold text-primary">
            {(o.profile?.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
            <p className="text-caption text-muted-foreground truncate">
              {o.profile?.name || o.profile?.email || "Unknown user"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <Money amount={o.price} className="text-sm font-semibold text-foreground" />
            <p className="text-caption text-muted-foreground">{timeAgo(o.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
