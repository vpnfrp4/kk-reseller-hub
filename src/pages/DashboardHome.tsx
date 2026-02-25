import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  Plus,
  Package,
  Clock,
  AlertTriangle,
  Receipt,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import CrossFade from "@/components/CrossFade";
import { format, subDays } from "date-fns";
import { PageContainer, Money } from "@/components/shared";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import MiniSparkline from "@/components/admin/MiniSparkline";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { MmStatus } from "@/components/shared/MmLabel";

const LOW_BALANCE_THRESHOLD = 20000;

export default function DashboardHome() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const navigate = useNavigate();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const l = useT();

  useEffect(() => { requestNotificationPermission(); }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("reseller-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-health"] });
        refreshProfile();
        if (!initialized.current) return;
        if (payload.eventType === "UPDATE" && payload.new?.status === "approved" && payload.new?.type === "topup") {
          const msg = `ငွေဖြည့်ခြင်း ${Number(payload.new.amount).toLocaleString()} MMK အတည်ပြုပြီး`;
          toast.success(msg);
          notifyEvent("ငွေဖြည့်အတည်ပြုပြီး", msg, "success");
        } else if (payload.eventType === "UPDATE" && payload.new?.status === "rejected") {
          toast.error("ငွေဖြည့်ခြင်း ငြင်းပယ်ခံရသည်။");
          notifyEvent("ငွေဖြည့်ငြင်းပယ်", "ငွေဖြည့်ခြင်း ငြင်းပယ်ခံရသည်။", "error");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-health"] });
        refreshProfile();
        if (!initialized.current) return;
        const msg = `မှာယူမှု: ${payload.new?.product_name || "အသစ်"}`;
        toast.success(msg);
        notifyEvent("မှာယူမှုပြုလုပ်ပြီး", msg, "success");
      })
      .subscribe();
    setTimeout(() => { initialized.current = true; }, 2000);
    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient, refreshProfile]);

  // Recent transactions
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Recent orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Wallet health stats
  const { data: walletHealth } = useQuery({
    queryKey: ["wallet-health"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const [ordersRes, topupsRes] = await Promise.all([
        supabase.from("orders").select("price").gte("created_at", thirtyDaysAgo),
        supabase.from("wallet_transactions").select("amount").eq("type", "topup").eq("status", "approved").gte("created_at", thirtyDaysAgo),
      ]);
      const orderPrices = (ordersRes.data || []).map((o) => Number(o.price));
      const spendingThisMonth = orderPrices.reduce((a, b) => a + b, 0);
      const avgOrderValue = orderPrices.length > 0 ? Math.round(spendingThisMonth / orderPrices.length) : 0;
      const totalTopups = (topupsRes.data || []).reduce((a, b) => a + Number(b.amount), 0);
      return { spendingThisMonth, totalTopups, avgOrderValue, orderCount: orderPrices.length };
    },
  });

  // 7-day spending sparkline
  const { data: sparklineData } = useQuery({
    queryKey: ["spending-sparkline-7d"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 6).toISOString();
      const { data } = await supabase.from("orders").select("price, created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: true });
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) days[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
      (data || []).forEach((row: any) => { const key = format(new Date(row.created_at), "yyyy-MM-dd"); if (key in days) days[key] += Number(row.price); });
      return Object.values(days);
    },
  });

  const balance = profile?.balance || 0;
  const displayBalance = useCountUp(balance, 800);
  const isLowBalance = balance < LOW_BALANCE_THRESHOLD;
  const avgOrder = walletHealth?.avgOrderValue || 3600;
  const approxPurchases = avgOrder > 0 ? Math.floor(balance / avgOrder) : 0;

  // Parallax for wallet hero
  const heroRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const handleScroll = useCallback(() => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setParallaxY((rect.top / window.innerHeight) * 30);
  }, []);
  useEffect(() => {
    const scrollEl = heroRef.current?.closest("main") || window;
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Merge recent activity
  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; type: "purchase" | "topup" | "debit"; label: string; amount: number; date: string; status: string }> = [];
    (orders || []).forEach((o: any) => { items.push({ id: o.id, type: "purchase", label: o.product_name, amount: -Number(o.price), date: o.created_at, status: o.status }); });
    (transactions || []).forEach((tx: any) => { items.push({ id: tx.id, type: tx.type === "topup" ? "topup" : "debit", label: tx.description, amount: tx.type === "topup" ? Number(tx.amount) : -Number(tx.amount), date: tx.created_at, status: tx.status }); });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [orders, transactions]);

  const quickActions = [
    { icon: Plus, label: t.dashboard.addFunds, onClick: () => setTopUpOpen(true), primary: true },
    { icon: Package, label: t.dashboard.browseProducts, onClick: () => navigate("/dashboard/products") },
    { icon: ShoppingCart, label: t.dashboard.viewOrders, onClick: () => navigate("/dashboard/orders") },
    { icon: Receipt, label: t.dashboard.transactions, onClick: () => navigate("/dashboard/wallet") },
  ];

  return (
    <PageContainer>
      {/* WALLET HERO */}
      <div
        ref={heroRef}
        className="wallet-hero p-[var(--space-section)] animate-fade-in relative"
        style={{ transform: `translateY(${parallaxY * 0.3}px)`, transition: "transform 0.1s linear" }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-card)]">
          <CrossFade
            isLoading={!profile}
            skeleton={
              <div className="space-y-3">
                <Skeleton className="h-4 w-32 rounded bg-muted/30" />
                <Skeleton className="h-14 w-56 rounded bg-muted/20" />
                <Skeleton className="h-4 w-44 rounded bg-muted/20" />
              </div>
            }
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50 mb-[var(--space-micro)]">
                {l(t.dashboard.balance)}
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl lg:text-6xl font-extrabold font-mono tabular-nums text-foreground tracking-tighter leading-none">
                  {displayBalance.toLocaleString()}
                </p>
                <span className="text-sm font-medium text-muted-foreground">MMK</span>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-[var(--space-compact)]">
                {l(t.dashboard.approxPurchases)}{" "}
                <span className="font-semibold text-foreground">{approxPurchases}</span>{" "}
                {l(t.products.qty)}
              </p>
            </div>
          </CrossFade>

          {/* Sparkline */}
          <div className="hidden md:flex flex-col items-center gap-1 shrink-0">
            {sparklineData && sparklineData.length > 1 ? (
              <>
                <MiniSparkline data={sparklineData} width={120} height={40} color="hsl(var(--primary))" className="opacity-70" />
                <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  {l(t.dashboard.spending7d)}
                </span>
              </>
            ) : (
              <div className="w-[120px] h-[40px] rounded-[var(--radius-btn)] bg-muted/10" />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-[var(--space-compact)] shrink-0">
            <button
              onClick={() => setTopUpOpen(true)}
              className="btn-glow px-[var(--space-card)] py-[var(--space-compact)] font-semibold text-sm flex items-center justify-center gap-[var(--space-tight)]"
            >
              <Plus className="w-4 h-4" />
              {l(t.dashboard.addFunds)}
            </button>
            <Link to="/dashboard/wallet">
              <button className="btn-glass px-[var(--space-card)] py-[var(--space-compact)] font-semibold text-sm flex items-center justify-center gap-[var(--space-tight)] w-full">
                <Receipt className="w-4 h-4" />
                {l(t.dashboard.viewTransactions)}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-compact)] animate-fade-in"
        style={{ animationDelay: "0.08s" }}
      >
        {quickActions.map((action, i) => (
          <button
            key={action.label.en}
            onClick={action.onClick}
            className={cn(
              "glass-card p-[var(--space-card)] flex flex-col items-center gap-[var(--space-compact)] text-center hover-lift group cursor-pointer",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            <div
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                action.primary
                  ? "bg-primary/10 text-primary group-hover:bg-primary/15"
                  : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50"
              )}
            >
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">{l(action.label)}</span>
          </button>
        ))}
      </div>

      {/* WALLET HEALTH */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-default)] animate-fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <HealthCard label={t.dashboard.spendingThisMonth} value={walletHealth?.spendingThisMonth || 0} icon={TrendingUp} isCurrency />
        <HealthCard label={t.dashboard.topups30d} value={walletHealth?.totalTopups || 0} icon={Wallet} isCurrency />
        <HealthCard label={t.dashboard.avgOrder} value={walletHealth?.avgOrderValue || 0} icon={ShoppingCart} isCurrency />
      </div>

      {/* LOW BALANCE */}
      {profile && isLowBalance && (
        <div
          className="glass-card border-warning/20 bg-warning/[0.03] p-[var(--space-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-default)] animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-start gap-[var(--space-compact)]">
            <div className="w-10 h-10 rounded-full bg-warning/8 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{l(t.dashboard.lowBalanceTitle)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l(t.dashboard.lowBalanceMsg)}</p>
            </div>
          </div>
          <button
            onClick={() => setTopUpOpen(true)}
            className="btn-glow px-[var(--space-card)] py-[var(--space-compact)] text-sm font-semibold flex items-center gap-[var(--space-tight)] shrink-0"
          >
            <Zap className="w-4 h-4" />
            {l(t.dashboard.quickTopUp)}
          </button>
        </div>
      )}

      {/* RECENT ACTIVITY */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between p-[var(--space-card)] border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">{l(t.dashboard.recentActivity)}</h3>
          <div className="flex gap-[var(--space-compact)]">
            <Link to="/dashboard/wallet" className="text-xs text-primary hover:underline font-medium">
              {l(t.dashboard.allTransactions)}
            </Link>
            <span className="text-border/40">|</span>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline font-medium">
              {l(t.dashboard.allOrders)}
            </Link>
          </div>
        </div>

        <CrossFade
          isLoading={txLoading && ordersLoading}
          skeleton={
            <div className="p-[var(--space-card)] space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded bg-muted/30" />
                    <Skeleton className="h-3 w-24 rounded bg-muted/20" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded bg-muted/20" />
                </div>
              ))}
            </div>
          }
        >
          <div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-[var(--space-section)] text-center">
                {l(t.dashboard.noActivity)}
              </p>
            ) : (
              recentActivity.map((item, i) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between px-[var(--space-card)] py-3 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors opacity-0 animate-row-in"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-center gap-[var(--space-compact)] min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        item.amount > 0 ? "bg-primary/8" : "bg-muted/30"
                      )}
                    >
                      {item.type === "topup" ? (
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {format(new Date(item.date), "MMM dd, hh:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-[var(--space-default)]">
                    <p
                      className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        item.amount > 0 ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.amount > 0 ? "+" : "\u2212"}
                      {Math.abs(item.amount).toLocaleString()}
                      <span className="text-[10px] font-medium text-muted-foreground ml-1">MMK</span>
                    </p>
                    {item.type === "topup" && <MmStatus status={item.status} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </CrossFade>
      </div>

      <TopUpDialog
        userId={profile?.user_id}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        hideTrigger
        onSubmitted={(id) => {
          setTopUpOpen(false);
          navigate(`/dashboard/topup-status/${id}`);
        }}
      />
    </PageContainer>
  );
}

/* Wallet Health Card */
function HealthCard({
  label,
  value,
  icon: Icon,
  isCurrency,
}: {
  label: { mm: string; en: string };
  value: number;
  icon: React.ElementType;
  isCurrency?: boolean;
}) {
  const animated = useCountUp(value, 700);
  const l = useT();
  return (
    <div className="stat-card space-y-[var(--space-compact)]">
      <div className="flex items-center gap-[var(--space-compact)]">
        <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
          {l(label)}
        </span>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-foreground tracking-tight">
        {isCurrency ? <Money amount={animated} /> : animated.toLocaleString()}
      </p>
    </div>
  );
}
