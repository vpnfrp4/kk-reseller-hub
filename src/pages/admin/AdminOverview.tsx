import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, ShoppingCart, AlertTriangle, Clock, Plus, CheckCircle2, ArrowRight,
  Package, KeyRound, Users, TrendingDown, ShieldAlert, Activity, BarChart3,
  Settings2, FileText, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays } from "date-fns";
import { PageContainer, DataCard, Money } from "@/components/shared";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import MiniSparkline from "@/components/admin/MiniSparkline";
import { useCountUp } from "@/hooks/use-count-up";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
const statVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26, delay: i * 0.08 },
  }),
};

function HeroStat({
  label, value, suffix = "MMK", icon: Icon, iconColor, featured = false, sparkData, index = 0,
}: {
  label: string; value: number; suffix?: string; icon: any; iconColor: string;
  featured?: boolean; sparkData?: number[]; index?: number;
}) {
  const animated = useCountUp(value, 900);
  const colorVar = iconColor.replace("text-", "");
  return (
    <motion.div
      custom={index}
      variants={statVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border bg-card/90 backdrop-blur-sm p-4 lg:p-5 group transition-shadow duration-300",
        featured
          ? "sm:col-span-2 border-warning/25 hover:shadow-[0_8px_30px_-12px_hsl(var(--warning)/0.2)]"
          : "border-border/50 hover:border-primary/20 hover:shadow-[var(--shadow-elevated)]"
      )}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 inset-x-4 h-[2px] rounded-b-full opacity-40"
        style={{ background: `hsl(var(--${colorVar}))` }}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{ background: `hsl(var(--${colorVar}) / 0.1)` }}
          >
            <Icon className={cn("w-[18px] h-[18px]", iconColor)} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.1em]">{label}</span>
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline data={sparkData} width={64} height={24} color={`hsl(var(--${colorVar}))`} className="opacity-40 group-hover:opacity-80 transition-opacity" />
        )}
      </div>
      <p className={cn("font-extrabold font-mono tabular-nums text-foreground tracking-tight leading-none", featured ? "text-[32px]" : "text-2xl")}>
        {animated.toLocaleString()}
        <span className="text-xs font-bold text-muted-foreground/60 ml-1.5">{suffix}</span>
      </p>
      {featured && (
        <p className="text-[10px] text-warning mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Financial Risk Indicator
        </p>
      )}
    </motion.div>
  );
}

/* ─── Alert Chip ─── */
function AlertChip({ label, count, color, to }: { label: string; count: number; color: string; to: string }) {
  if (count === 0) return null;
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.98]", color)}>
      <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-pulse" />
      {label}
      <span className="font-mono font-extrabold">{count}</span>
    </Link>
  );
}

/* ─── Quick Access Card ─── */
function QuickAccessCard({ label, icon: Icon, to, description, index = 0 }: { label: string; icon: any; to: string; description: string; index?: number }) {
  return (
    <motion.div
      custom={index}
      variants={statVariants}
      initial="hidden"
      animate="visible"
    >
      <Link
        to={to}
        className="relative overflow-hidden rounded-[var(--radius-card)] border border-border/40 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-2.5 group hover:border-primary/20 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1 transition-all duration-300"
      >
        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 group-hover:scale-105 transition-all duration-200 relative z-10">
          <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-extrabold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 mt-auto self-end group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all relative z-10" />
      </Link>
    </motion.div>
  );
}


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
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["admin-recent-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
        queryClient.invalidateQueries({ queryKey: ["admin-pending-orders-list"] });
        if (initialized.current) {
          const event = payload.eventType;
          if (event === "INSERT") {
            const msg = `New order: ${payload.new?.product_name || "Unknown"}`;
            toast.info(msg);
            notifyEvent("New Order", msg, "info");
          } else if (event === "UPDATE" && payload.old?.status !== payload.new?.status) {
            const msg = `Order ${payload.new?.order_code || ""} → ${payload.new?.status}`;
            toast.info(msg);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-pending-topups-list"] });
        queryClient.invalidateQueries({ queryKey: ["admin-topup-chart"] });
        if (initialized.current && payload.eventType === "INSERT" && payload.new?.type === "topup") {
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
      <div className="space-y-5 lg:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="cd-page-head mb-4">
            <div>
              <h1>Control Center</h1>
              <p>Financial & Operations Overview</p>
            </div>
            <div className="cd-page-head-actions">
              <Link to="/admin/credentials">
                <Button size="sm" className="gap-1.5 h-9 text-xs font-bold rounded-xl shadow-lg shadow-primary/15">
                  <Plus className="w-3.5 h-3.5" />Credentials
                </Button>
              </Link>
              <Link to="/admin/topups">
                <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs font-bold rounded-xl relative">
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
        </motion.div>

        {/* KPI Grid */}
        <div className="cd-kpi-grid">
          <HeroStat label="Wallet Liability" value={stats?.walletLiability || 0} icon={AlertTriangle} iconColor="text-warning" featured sparkData={sparkTopup} index={0} />
          <HeroStat label="Revenue (30d)" value={stats?.monthRevenue || 0} icon={Wallet} iconColor="text-success" sparkData={sparkRevenue} index={1} />
          <HeroStat label="Pending Top-ups" value={stats?.pendingTopups || 0} icon={Clock} iconColor="text-ice" suffix="" index={2} />
          <HeroStat label="Pending Orders" value={stats?.pendingOrders || 0} icon={ShoppingCart} iconColor="text-primary" suffix="" index={3} />
        </div>

        {/* ═══ 2. OPERATIONAL ALERT BAR ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40"
        >
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mr-1">Alerts</span>
          <AlertChip label="Low Stock" count={(stats?.lowStockProducts || []).length} color="bg-destructive/8 text-destructive border border-destructive/15" to="/admin/products" />
          <AlertChip label="Expiring Creds" count={stats?.expiringSoon || 0} color="bg-warning/8 text-warning border border-warning/15" to="/admin/credentials?status=expiring" />
          <AlertChip label="Pending Manual" count={stats?.pendingOrders || 0} color="bg-primary/8 text-primary border border-primary/15" to="/admin/orders" />
          <AlertChip label="Low Balance" count={lowBalanceResellers?.length || 0} color="bg-ice/8 text-ice border border-ice/15" to="/admin/resellers" />
          {(stats?.lowStockProducts || []).length === 0 && (stats?.expiringSoon || 0) === 0 && (stats?.pendingOrders || 0) === 0 && (lowBalanceResellers?.length || 0) === 0 && (
            <span className="text-[11px] text-success font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All systems clear
            </span>
          )}
        </motion.div>

        {/* ═══ 2b. COLLAPSIBLE ACTION SECTIONS ═══ */}
        <div className="cd-section-grid">
          <CollapsibleSection
            title="Orders Pending Review"
            totalCount={pendingOrders?.length || 0}
            previewCount={3}
            summary={`${(pendingOrders?.length || 0) - 3} more orders awaiting action`}
            headerRight={
              <Link to="/admin/orders" className="text-[11px] text-primary hover:underline font-bold" onClick={(e) => e.stopPropagation()}>
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
                  className="flex items-center gap-3 p-3 border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors rounded-lg"
                >
                  <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-warning" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{o.product_name}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {o.profile?.name || o.profile?.email || "Unknown"} · {o.order_code}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Money amount={o.price} className="text-xs font-bold text-foreground font-mono" />
                    <p className="text-[9px] text-muted-foreground/60">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Top-up Requests"
            totalCount={pendingTopups?.length || 0}
            previewCount={3}
            summary={`${(pendingTopups?.length || 0) - 3} more top-ups awaiting approval`}
            headerRight={
              <Link to="/admin/topups" className="text-[11px] text-primary hover:underline font-bold" onClick={(e) => e.stopPropagation()}>
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
                  className="flex items-center gap-3 p-3 border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors rounded-lg"
                >
                  <div className="w-8 h-8 rounded-xl bg-ice/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-ice" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {t.profile?.name || t.profile?.email || "Unknown"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      via {t.method || "Unknown"} · Pending
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-success font-mono">
                      +<Money amount={t.amount} className="inline text-xs" />
                    </span>
                    <p className="text-[9px] text-muted-foreground/60">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </CollapsibleSection>
        </div>

        {/* ═══ 3. STOCK OVERVIEW ═══ */}
        <DataCard title="Stock Overview" description={`${stats?.availableCredentials || 0} available / ${total} total`}>
          <div className="space-y-3">
            <div className="w-full h-3 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-success to-success/70"
                initial={{ width: 0 }}
                animate={{ width: `${availablePct}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" />Available {stats?.availableCredentials || 0}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />Sold {sold}</span>
              <span className="ml-auto font-mono font-bold">{stats?.soldToday || 0} sold today</span>
            </div>
          </div>
        </DataCard>

        {/* ═══ 5. FINANCIAL CONTROL — QUICK ACCESS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickAccessCard label="Products" icon={Package} to="/admin/products" description="Manage catalog" index={0} />
          <QuickAccessCard label="Orders" icon={ShoppingCart} to="/admin/orders" description="Order management" index={1} />
          <QuickAccessCard label="Top-ups" icon={Wallet} to="/admin/topups" description="Verify deposits" index={2} />
          <QuickAccessCard label="Resellers" icon={Users} to="/admin/resellers" description="User management" index={3} />
          <QuickAccessCard label="Credentials" icon={KeyRound} to="/admin/credentials" description="Stock control" index={4} />
        </div>


        {/* ═══ LOW BALANCE + RECENT ORDERS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DataCard
            title="Low Balance Alert"
            description={`${lowBalanceResellers?.length || 0} below ${threshold.toLocaleString()} MMK`}
            className="border-warning/15"
            actions={
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4 rounded-xl" align="end">
                  <p className="text-sm font-bold text-foreground mb-2">Threshold</p>
                  <div className="flex gap-2">
                    <Input type="number" value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} className="h-8 text-sm bg-muted/20 border-border rounded-lg" min={0} />
                    <Button size="sm" className="h-8 text-xs shrink-0 rounded-lg font-bold" onClick={() => {
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
              <div className="space-y-1.5">
                {lowBalanceResellers.slice(0, 5).map((r: any) => (
                  <div key={r.user_id} className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10 hover:bg-warning/8 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-foreground">{r.name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground/70">{r.email}</p>
                    </div>
                    <Money amount={r.balance} className="text-sm font-extrabold text-warning font-mono" />
                  </div>
                ))}
                {lowBalanceResellers.length > 5 && (
                  <Link to="/admin/resellers" className="text-[10px] text-primary hover:underline text-center block pt-1 font-bold">
                    +{lowBalanceResellers.length - 5} more →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-compact">No resellers below threshold</p>
            )}
          </DataCard>

          <DataCard title="Recent Orders">
            <RecentOrdersFeed />
          </DataCard>
        </div>
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

  const statusColors: Record<string, string> = {
    delivered: "bg-success",
    completed: "bg-success",
    pending_creation: "bg-primary",
    pending_review: "bg-warning",
    processing: "bg-warning animate-pulse",
    failed: "bg-destructive",
    cancelled: "bg-muted-foreground/40",
  };

  return (
    <div className="space-y-0.5">
      {orders.map((o: any) => (
        <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center text-[10px] font-extrabold text-primary shrink-0 group-hover:bg-primary/12 transition-colors">
            {(o.profile?.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{o.product_name}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{o.profile?.name || o.profile?.email || "—"} · {timeAgo(o.created_at)}</p>
          </div>
          <div className="text-right shrink-0 flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", statusColors[o.status] || "bg-muted-foreground/30")} />
            <Money amount={o.price} className="text-xs font-extrabold text-foreground font-mono" />
          </div>
        </div>
      ))}
    </div>
  );
}
