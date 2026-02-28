import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, ShoppingCart, AlertTriangle, Clock, Plus, CheckCircle2, ArrowRight,
  Package, KeyRound, Users, TrendingDown, ShieldAlert, Activity, BarChart3,
  Settings2, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import LiveActivityFeed from "@/components/admin/LiveActivityFeed";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays } from "date-fns";
import { PageContainer, DataCard, Money } from "@/components/shared";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import MiniSparkline from "@/components/admin/MiniSparkline";
import { useCountUp } from "@/hooks/use-count-up";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const THRESHOLD_KEY = "admin-low-balance-threshold";
const DEFAULT_THRESHOLD = 5000;

function getStoredThreshold(): number {
  try {
    const v = localStorage.getItem(THRESHOLD_KEY);
    if (v) return Math.max(0, Number(v));
  } catch {}
  return DEFAULT_THRESHOLD;
}

/* ─── Hero Stat ─── */
function HeroStat({
  label, value, suffix = "MMK", icon: Icon, iconColor, featured = false, sparkData, delay = 0,
}: {
  label: string; value: number; suffix?: string; icon: any; iconColor: string;
  featured?: boolean; sparkData?: number[]; delay?: number;
}) {
  const animated = useCountUp(value, 900);
  const colorVar = iconColor.replace("text-", "");
  return (
    <div
      className={`stat-card group opacity-0 animate-stagger-in ${featured ? "sm:col-span-2 border-warning/30 ring-1 ring-warning/10" : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-compact">
        <div className="flex items-center gap-compact">
          <div className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0" style={{ background: `hsl(var(--${colorVar}) / 0.1)` }}>
            <Icon className={`w-[18px] h-[18px] ${iconColor}`} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</span>
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline data={sparkData} width={64} height={24} color={`hsl(var(--${colorVar}))`} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <p className={`font-bold font-mono tabular-nums text-foreground tracking-tight ${featured ? "text-[32px]" : "text-2xl"}`}>
        {animated.toLocaleString()}
        <span className="text-sm font-semibold text-muted-foreground ml-1.5">{suffix}</span>
      </p>
      {featured && <p className="text-[10px] text-warning mt-1 font-medium uppercase tracking-wider">⚠ Financial Risk Indicator</p>}
    </div>
  );
}

/* ─── Alert Chip ─── */
function AlertChip({ label, count, color, to }: { label: string; count: number; color: string; to: string }) {
  if (count === 0) return null;
  return (
    <Link to={to} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 ${color}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-70" />
      {label}
      <span className="font-mono font-bold">{count}</span>
    </Link>
  );
}

/* ─── Quick Access Card ─── */
function QuickAccessCard({ label, icon: Icon, to, description, delay = 0 }: { label: string; icon: any; to: string; description: string; delay?: number }) {
  return (
    <Link
      to={to}
      className="glass-card p-card flex flex-col gap-compact hover-lift group opacity-0 animate-stagger-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="w-11 h-11 rounded-btn bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-micro">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 mt-auto self-end group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

/* ─── Chart helpers ─── */
function buildChartDays(rawData: any[], dateKey: string, valueKey: string) {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
  (rawData || []).forEach((row: any) => {
    const key = format(new Date(row[dateKey]), "MMM dd");
    if (key in days) days[key] += Number(row[valueKey]);
  });
  return Object.entries(days).map(([date, value]) => ({ date, value }));
}

function buildChartDaysCount(rawData: any[], dateKey: string) {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
  (rawData || []).forEach((row: any) => {
    const key = format(new Date(row[dateKey]), "MMM dd");
    if (key in days) days[key]++;
  });
  return Object.entries(days).map(([date, value]) => ({ date, value }));
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

/* ═══ MAIN COMPONENT ═══ */
export default function AdminOverview() {
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const [threshold, setThreshold] = useState(getStoredThreshold);
  const [thresholdInput, setThresholdInput] = useState(String(getStoredThreshold()));
  const thresholdRef = useRef(threshold);

  useEffect(() => { requestNotificationPermission(); }, []);

  // Realtime listeners
  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["admin-recent-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
        if (initialized.current) {
          const msg = `New order: ${payload.new?.product_name || "Unknown"}`;
          toast.info(msg);
          notifyEvent("New Order", msg, "info");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        if (initialized.current && payload.new?.type === "topup") {
          const msg = `New top-up request: ${Number(payload.new.amount).toLocaleString()} MMK`;
          toast.info(msg);
          notifyEvent("New Top-up Request", msg, "info");
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_credentials" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["admin-low-balance"] });
        if (initialized.current && payload.new?.balance < thresholdRef.current) {
          const name = payload.new.name || payload.new.email || "A reseller";
          const msg = `${name}'s balance dropped to ${Number(payload.new.balance).toLocaleString()} MMK`;
          toast.warning(msg);
          notifyEvent("Low Balance Alert", msg, "info");
        }
      })
      .subscribe();
    setTimeout(() => { initialized.current = true; }, 2000);
    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient]);

  /* ─── DATA QUERIES ─── */

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        pendingTopups, pendingOrders, walletLiability,
        availableCreds, totalCreds, soldToday, expiringSoon,
        monthRevenue, lowStockProducts,
      ] = await Promise.all([
        supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_creation", "pending_review"]),
        supabase.from("profiles").select("balance").then(({ data }) =>
          (data || []).reduce((sum: number, p: any) => sum + Number(p.balance), 0)
        ),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", true).gte("sold_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false).not("expires_at", "is", null).lte("expires_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("orders").select("price").gte("created_at", subDays(new Date(), 30).toISOString()).then(({ data }) =>
          (data || []).reduce((sum: number, o: any) => sum + Number(o.price), 0)
        ),
        supabase.from("products").select("id, name, stock").lte("stock", 5).then(({ data }) => data || []),
      ]);
      return {
        pendingTopups: pendingTopups.count || 0,
        pendingOrders: pendingOrders.count || 0,
        walletLiability,
        availableCredentials: availableCreds.count || 0,
        totalCredentials: totalCreds.count || 0,
        soldToday: soldToday.count || 0,
        expiringSoon: expiringSoon.count || 0,
        monthRevenue,
        lowStockProducts,
      };
    },
  });

  // 7-day spark data
  const { data: sparkRaw } = useQuery({
    queryKey: ["admin-spark-7d"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("price, created_at").gte("created_at", subDays(new Date(), 7).toISOString()).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const sparkRevenue = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    (sparkRaw || []).forEach((r: any) => { const key = format(new Date(r.created_at), "yyyy-MM-dd"); if (key in days) days[key] += Number(r.price); });
    return Object.values(days);
  }, [sparkRaw]);

  const sparkSales = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    (sparkRaw || []).forEach((r: any) => { const key = format(new Date(r.created_at), "yyyy-MM-dd"); if (key in days) days[key]++; });
    return Object.values(days);
  }, [sparkRaw]);

  // Top-up spark
  const { data: topupSparkRaw } = useQuery({
    queryKey: ["admin-topup-spark-7d"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("amount, created_at").eq("type", "topup").gte("created_at", subDays(new Date(), 7).toISOString()).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const sparkTopup = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    (topupSparkRaw || []).forEach((r: any) => { const key = format(new Date(r.created_at), "yyyy-MM-dd"); if (key in days) days[key] += Number(r.amount); });
    return Object.values(days);
  }, [topupSparkRaw]);

  // 30-day chart data
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data: revenueRaw } = useQuery({
    queryKey: ["admin-revenue-chart"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("price, created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: salesRaw } = useQuery({
    queryKey: ["admin-sales-chart"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: topupChartRaw } = useQuery({
    queryKey: ["admin-topup-chart"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("amount, created_at").eq("type", "topup").eq("status", "approved").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const revenueChart = useMemo(() => buildChartDays(revenueRaw || [], "created_at", "price"), [revenueRaw]);
  const salesChart = useMemo(() => buildChartDaysCount(salesRaw || [], "created_at"), [salesRaw]);
  const topupChart = useMemo(() => buildChartDays(topupChartRaw || [], "created_at", "amount"), [topupChartRaw]);

  // Top products
  const { data: topProducts } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("product_name, price").gte("created_at", thirtyDaysAgo);
      const map: Record<string, { name: string; orders: number; revenue: number }> = {};
      (data || []).forEach((o: any) => {
        if (!map[o.product_name]) map[o.product_name] = { name: o.product_name, orders: 0, revenue: 0 };
        map[o.product_name].orders++;
        map[o.product_name].revenue += Number(o.price);
      });
      return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    },
  });

  // Pending orders for collapsible
  const { data: pendingOrders } = useQuery({
    queryKey: ["admin-pending-orders-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, product_name, price, created_at, user_id, status")
        .in("status", ["pending_creation", "pending_review"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      return data.map((o: any) => ({ ...o, profile: profileMap[o.user_id] || null }));
    },
  });

  // Pending topups for collapsible
  const { data: pendingTopups } = useQuery({
    queryKey: ["admin-pending-topups-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("id, amount, method, created_at, user_id, status")
        .eq("type", "topup")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      return data.map((t: any) => ({ ...t, profile: profileMap[t.user_id] || null }));
    },
  });

  // Low balance resellers
  const { data: lowBalanceResellers } = useQuery({
    queryKey: ["admin-low-balance", threshold],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, name, email, balance").lt("balance", threshold).order("balance", { ascending: true });
      return data || [];
    },
  });

  const sold = (stats?.totalCredentials || 0) - (stats?.availableCredentials || 0);
  const total = stats?.totalCredentials || 0;
  const availablePct = total > 0 ? ((stats?.availableCredentials || 0) / total) * 100 : 0;

  return (
    <PageContainer>
      {/* ═══ 1. CONTROL OVERVIEW HERO ═══ */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-tight mb-default">
          <div>
            <h1 className="text-h1 text-foreground tracking-tight">Control Center</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-micro">Financial & Operations Overview</p>
          </div>
          <div className="flex items-center gap-tight">
            <Link to="/admin/credentials">
              <Button size="sm" className="btn-glow gap-1.5 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" />Credentials
              </Button>
            </Link>
            <Link to="/admin/topups">
              <Button size="sm" variant="outline" className="btn-glass gap-1.5 h-8 text-xs relative">
                <CheckCircle2 className="w-3.5 h-3.5" />Top-ups
                {(stats?.pendingTopups || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                    {stats!.pendingTopups}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-default">
          <HeroStat label="Wallet Liability" value={stats?.walletLiability || 0} icon={AlertTriangle} iconColor="text-warning" featured sparkData={sparkTopup} delay={0} />
          <HeroStat label="Revenue (30d)" value={stats?.monthRevenue || 0} icon={Wallet} iconColor="text-success" sparkData={sparkRevenue} delay={0.08} />
          <HeroStat label="Pending Top-ups" value={stats?.pendingTopups || 0} icon={Clock} iconColor="text-ice" suffix="" delay={0.16} />
          <HeroStat label="Pending Orders" value={stats?.pendingOrders || 0} icon={ShoppingCart} iconColor="text-primary" suffix="" delay={0.24} />
        </div>
      </div>

      {/* ═══ 2. OPERATIONAL ALERT BAR ═══ */}
      <div className="flex flex-wrap items-center gap-tight p-compact rounded-btn bg-muted/20 border border-border/50 animate-fade-in [animation-delay:0.2s]">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">Alerts</span>
        <AlertChip label="Low Stock" count={(stats?.lowStockProducts || []).length} color="bg-destructive/10 text-destructive" to="/admin/products" />
        <AlertChip label="Expiring Creds" count={stats?.expiringSoon || 0} color="bg-warning/10 text-warning" to="/admin/credentials?status=expiring" />
        <AlertChip label="Pending Manual" count={stats?.pendingOrders || 0} color="bg-primary/10 text-primary" to="/admin/orders" />
        <AlertChip label="Low Balance" count={lowBalanceResellers?.length || 0} color="bg-ice/10 text-ice" to="/admin/resellers" />
        {(stats?.lowStockProducts || []).length === 0 && (stats?.expiringSoon || 0) === 0 && (stats?.pendingOrders || 0) === 0 && (lowBalanceResellers?.length || 0) === 0 && (
          <span className="text-[11px] text-success font-medium">All clear ✓</span>
        )}
      </div>

      {/* ═══ 2b. COLLAPSIBLE ACTION SECTIONS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-default">
        {/* Pending Orders */}
        <CollapsibleSection
          title="Orders Pending Review"
          totalCount={pendingOrders?.length || 0}
          previewCount={3}
          className="animate-fade-in [animation-delay:0.22s]"
          summary={`${(pendingOrders?.length || 0) - 3} more orders awaiting action`}
          headerRight={
            <Link to="/admin/orders" className="text-[11px] text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>
              View all
            </Link>
          }
        >
          {(!pendingOrders || pendingOrders.length === 0) ? (
            <div className="p-card text-center">
              <CheckCircle2 className="w-6 h-6 text-success/40 mx-auto mb-tight" />
              <p className="text-sm text-muted-foreground">No orders pending review</p>
            </div>
          ) : (
            pendingOrders.map((o: any) => (
              <Link
                key={o.id}
                to={`/admin/orders?order=${o.id}`}
                className="flex items-center gap-compact p-compact border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-warning" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {o.profile?.name || o.profile?.email || "Unknown"} &middot; {o.order_code}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Money amount={o.price} className="text-xs font-semibold text-foreground font-mono" />
                  <p className="text-[9px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))
          )}
        </CollapsibleSection>

        {/* Pending Top-ups */}
        <CollapsibleSection
          title="Top-up Requests"
          totalCount={pendingTopups?.length || 0}
          previewCount={3}
          className="animate-fade-in [animation-delay:0.25s]"
          summary={`${(pendingTopups?.length || 0) - 3} more top-ups awaiting approval`}
          headerRight={
            <Link to="/admin/topups" className="text-[11px] text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>
              View all
            </Link>
          }
        >
          {(!pendingTopups || pendingTopups.length === 0) ? (
            <div className="p-card text-center">
              <CheckCircle2 className="w-6 h-6 text-success/40 mx-auto mb-tight" />
              <p className="text-sm text-muted-foreground">No pending top-ups</p>
            </div>
          ) : (
            pendingTopups.map((t: any) => (
              <Link
                key={t.id}
                to="/admin/topups"
                className="flex items-center gap-compact p-compact border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-ice/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-ice" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.profile?.name || t.profile?.email || "Unknown"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    via {t.method || "Unknown"} &middot; Pending
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-success font-mono">
                    +<Money amount={t.amount} className="inline text-xs" />
                  </span>
                  <p className="text-[9px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))
          )}
        </CollapsibleSection>
      </div>

      {/* ═══ 3. REAL-TIME ACTIVITY + 4. PRODUCT PERFORMANCE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-default">
        {/* Live Feed */}
        <div className="lg:col-span-1">
          <LiveActivityFeed />
        </div>

        {/* Product Performance */}
        <div className="lg:col-span-2 space-y-default">
          {/* Top Selling */}
          <DataCard title="Top Products (30d)" description="Revenue leaders" className="animate-fade-in [animation-delay:0.3s]">
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-tight">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-compact p-compact rounded-btn hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.orders} orders</p>
                    </div>
                    <Money amount={p.revenue} className="text-sm font-semibold text-foreground font-mono" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-compact">No orders in last 30 days</p>
            )}
          </DataCard>

          {/* Credentials stock bar */}
          <DataCard title="Stock Overview" description={`${stats?.availableCredentials || 0} available / ${total} total`} className="animate-fade-in [animation-delay:0.35s]">
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mb-compact">
              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${availablePct}%` }} />
            </div>
            <div className="flex items-center gap-default text-[11px] text-muted-foreground">
              <span className="flex items-center gap-micro"><span className="w-2 h-2 rounded-full bg-success" />Available {stats?.availableCredentials || 0}</span>
              <span className="flex items-center gap-micro"><span className="w-2 h-2 rounded-full bg-destructive" />Sold {sold}</span>
              <span className="ml-auto font-mono">{stats?.soldToday || 0} sold today</span>
            </div>
          </DataCard>
        </div>
      </div>

      {/* ═══ 5. FINANCIAL CONTROL — QUICK ACCESS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-default">
        <QuickAccessCard label="Products" icon={Package} to="/admin/products" description="Manage catalog" delay={0.3} />
        <QuickAccessCard label="Orders" icon={ShoppingCart} to="/admin/orders" description="Order management" delay={0.35} />
        <QuickAccessCard label="Top-ups" icon={Wallet} to="/admin/topups" description="Verify deposits" delay={0.4} />
        <QuickAccessCard label="Resellers" icon={Users} to="/admin/resellers" description="User management" delay={0.45} />
        <QuickAccessCard label="Credentials" icon={KeyRound} to="/admin/credentials" description="Stock control" delay={0.5} />
      </div>

      {/* ═══ 6. DATA VISUALIZATION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-default">
        {/* Revenue */}
        <DataCard title="Revenue Trend (30d)" className="animate-fade-in [animation-delay:0.4s]">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} MMK`, "Revenue"]} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={1.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Top-up */}
        <DataCard title="Top-up Volume (30d)" className="animate-fade-in [animation-delay:0.45s]">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topupChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} MMK`, "Top-ups"]} />
                <Bar dataKey="value" fill="hsl(var(--ice))" radius={[3, 3, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Order volume */}
        <DataCard title="Order Volume (30d)" className="animate-fade-in [animation-delay:0.5s]">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Orders"]} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>

      {/* ═══ LOW BALANCE + RECENT ORDERS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-default">
        <DataCard
          title="Low Balance Alert"
          description={`${lowBalanceResellers?.length || 0} below ${threshold.toLocaleString()} MMK`}
          className="border-warning/20 animate-fade-in [animation-delay:0.5s]"
          actions={
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-card" align="end">
                <p className="text-sm font-medium text-foreground mb-tight">Threshold</p>
                <div className="flex gap-tight">
                  <Input type="number" value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} className="h-8 text-sm bg-muted/30 border-border" min={0} />
                  <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => {
                    const val = Math.max(0, Math.round(Number(thresholdInput)));
                    setThreshold(val); thresholdRef.current = val;
                    localStorage.setItem(THRESHOLD_KEY, String(val));
                    setThresholdInput(String(val));
                    queryClient.invalidateQueries({ queryKey: ["admin-low-balance"] });
                    toast.success(`Threshold: ${val.toLocaleString()} MMK`);
                  }}>Set</Button>
                </div>
              </PopoverContent>
            </Popover>
          }
        >
          {lowBalanceResellers && lowBalanceResellers.length > 0 ? (
            <div className="space-y-tight">
              {lowBalanceResellers.slice(0, 5).map((r: any) => (
                <div key={r.user_id} className="flex items-center justify-between p-compact rounded-btn bg-warning/5 border border-warning/10 hover:bg-warning/10 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.email}</p>
                  </div>
                  <Money amount={r.balance} className="text-sm font-semibold text-warning font-mono" />
                </div>
              ))}
              {lowBalanceResellers.length > 5 && (
                <Link to="/admin/resellers" className="text-[10px] text-primary hover:underline text-center block pt-micro">
                  +{lowBalanceResellers.length - 5} more →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-compact">No resellers below threshold</p>
          )}
        </DataCard>

        <DataCard title="Recent Orders" className="animate-fade-in [animation-delay:0.55s]">
          <RecentOrdersFeed />
        </DataCard>
      </div>
    </PageContainer>
  );
}

/* ─── Recent Orders Sub-component ─── */
function RecentOrdersFeed() {
  const { data: orders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, price, created_at, user_id, status")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      return data.map((o: any) => ({ ...o, profile: profileMap[o.user_id] || null }));
    },
  });

  if (!orders || orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-card">No orders yet</p>;
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

  const statusDot: Record<string, string> = {
    delivered: "bg-success",
    pending_creation: "bg-primary",
    pending_review: "bg-warning",
  };

  return (
    <div className="space-y-micro">
      {orders.map((o: any) => (
        <div key={o.id} className="flex items-center gap-compact p-compact rounded-btn hover:bg-muted/30 transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {(o.profile?.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{o.profile?.name || o.profile?.email || "—"}</p>
          </div>
          <div className="text-right shrink-0 flex items-center gap-tight">
            <div className={`w-1.5 h-1.5 rounded-full ${statusDot[o.status] || "bg-muted-foreground"}`} />
            <Money amount={o.price} className="text-xs font-semibold text-foreground font-mono" />
          </div>
        </div>
      ))}
    </div>
  );
}
