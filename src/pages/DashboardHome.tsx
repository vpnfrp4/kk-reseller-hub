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
import PwaInstallBanner from "@/components/PwaInstallBanner";

const LOW_BALANCE_THRESHOLD = 20000;

export default function DashboardHome() {
  const { user, profile, refreshProfile } = useAuth();
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
          const msg = l(t.dashboard.topupApprovedToast).replace("{amount}", Number(payload.new.amount).toLocaleString());
          toast.success(msg);
          notifyEvent(l(t.dashboard.topupApprovedNotif), msg, "success");
        } else if (payload.eventType === "UPDATE" && payload.new?.status === "rejected") {
          const msg = l(t.dashboard.topupRejectedToast);
          toast.error(msg);
          notifyEvent(l(t.dashboard.topupRejectedNotif), msg, "error");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-health"] });
        refreshProfile();
        if (!initialized.current) return;
        const msg = l(t.dashboard.orderToast).replace("{name}", payload.new?.product_name || l(t.dashboard.orderNewFallback));
        toast.success(msg);
        notifyEvent(l(t.dashboard.orderNotif), msg, "success");
      })
      .subscribe();
    setTimeout(() => { initialized.current = true; }, 2000);
    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient, refreshProfile, l]);

  // Recent transactions
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Recent orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Wallet health stats
  const { data: walletHealth } = useQuery({
    queryKey: ["wallet-health"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const [ordersRes, topupsRes] = await Promise.all([
        supabase.from("orders").select("price").eq("user_id", user!.id).gte("created_at", thirtyDaysAgo),
        supabase.from("wallet_transactions").select("amount").eq("user_id", user!.id).eq("type", "topup").eq("status", "approved").gte("created_at", thirtyDaysAgo),
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
      const { data } = await supabase.from("orders").select("price, created_at").eq("user_id", user!.id).gte("created_at", sevenDaysAgo).order("created_at", { ascending: true });
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
      {/* PWA INSTALL BANNER */}
      <PwaInstallBanner />

      {/* WALLET HERO */}
      <div
        ref={heroRef}
        className="wallet-hero p-8 md:p-10 animate-fade-in relative"
        style={{ transform: `translateY(${parallaxY * 0.3}px)`, transition: "transform 0.1s linear" }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <CrossFade
            isLoading={!profile}
            skeleton={
              <div className="space-y-4">
                <Skeleton className="h-5 w-32 rounded bg-secondary" />
                <Skeleton className="h-16 w-64 rounded bg-secondary" />
                <Skeleton className="h-4 w-48 rounded bg-secondary" />
              </div>
            }
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {l(t.dashboard.balance)}
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl lg:text-6xl font-extrabold font-mono tabular-nums text-foreground tracking-tighter leading-none">
                  {displayBalance.toLocaleString()}
                </p>
                <span className="text-base font-semibold text-muted-foreground">MMK</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {l(t.dashboard.approxPurchases)}{" "}
                <span className="font-bold text-foreground">{approxPurchases}</span>{" "}
                {l(t.products.qty)}
              </p>
            </div>
          </CrossFade>

          {/* Sparkline */}
          <div className="hidden md:flex flex-col items-center gap-2 shrink-0">
            {sparklineData && sparklineData.length > 1 ? (
              <>
                <MiniSparkline data={sparklineData} width={120} height={40} color="hsl(var(--primary))" className="opacity-80" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {l(t.dashboard.spending7d)}
                </span>
              </>
            ) : (
              <div className="w-[120px] h-[40px] rounded-xl bg-secondary" />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setTopUpOpen(true)}
              className="btn-glow px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {l(t.dashboard.addFunds)}
            </button>
            <Link to="/dashboard/wallet">
              <button className="btn-glass px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2 w-full">
                <Receipt className="w-4 h-4" />
                {l(t.dashboard.viewTransactions)}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in"
        style={{ animationDelay: "0.08s" }}
      >
        {quickActions.map((action, i) => (
          <button
            key={action.label.en}
            onClick={action.onClick}
            className={cn(
              "glass-card p-6 flex flex-col items-center gap-3 text-center hover-lift group cursor-pointer",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                action.primary
                  ? "bg-primary/10 text-primary group-hover:bg-primary/15"
                  : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
              )}
            >
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">{l(action.label)}</span>
          </button>
        ))}
      </div>

      {/* WALLET HEALTH */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <HealthCard label={t.dashboard.spendingThisMonth} value={walletHealth?.spendingThisMonth || 0} icon={TrendingUp} isCurrency />
        <HealthCard label={t.dashboard.topups30d} value={walletHealth?.totalTopups || 0} icon={Wallet} isCurrency />
        <HealthCard label={t.dashboard.avgOrder} value={walletHealth?.avgOrderValue || 0} icon={ShoppingCart} isCurrency />
      </div>

      {/* LOW BALANCE */}
      {profile && isLowBalance && (
        <div
          className="glass-card border-warning/30 bg-warning/[0.05] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{l(t.dashboard.lowBalanceTitle)}</p>
              <p className="text-sm text-muted-foreground mt-1">{l(t.dashboard.lowBalanceMsg)}</p>
            </div>
          </div>
          <button
            onClick={() => setTopUpOpen(true)}
            className="btn-glow px-6 py-3 text-sm font-semibold flex items-center gap-2 shrink-0"
          >
            <Zap className="w-4 h-4" />
            {l(t.dashboard.quickTopUp)}
          </button>
        </div>
      )}

      {/* RECENT ACTIVITY */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{l(t.dashboard.recentActivity)}</h3>
          <div className="flex gap-3">
            <Link to="/dashboard/wallet" className="text-sm text-primary hover:underline font-medium">
              {l(t.dashboard.allTransactions)}
            </Link>
            <span className="text-border">|</span>
            <Link to="/dashboard/orders" className="text-sm text-primary hover:underline font-medium">
              {l(t.dashboard.allOrders)}
            </Link>
          </div>
        </div>

        <CrossFade
          isLoading={txLoading && ordersLoading}
          skeleton={
            <div className="p-6 space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded bg-secondary" />
                    <Skeleton className="h-3 w-24 rounded bg-secondary" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded bg-secondary" />
                </div>
              ))}
            </div>
          }
        >
          <div>
            {recentActivity.length === 0 ? (
              <p className="text-base text-muted-foreground py-8 text-center">
                {l(t.dashboard.noActivity)}
              </p>
            ) : (
              recentActivity.map((item, i) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors opacity-0 animate-row-in"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        item.amount > 0 ? "bg-primary/10" : "bg-secondary"
                      )}
                    >
                      {item.type === "topup" ? (
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.date), "MMM dd, hh:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p
                      className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        item.amount > 0 ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.amount > 0 ? "+" : "\u2212"}
                      {Math.abs(item.amount).toLocaleString()}
                      <span className="text-xs font-semibold text-muted-foreground ml-1">MMK</span>
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
          navigate(`/dashboard/wallet/topup-status?id=${id}`);
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
    <div className="stat-card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-muted-foreground" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
          {l(label)}
        </span>
      </div>
      <p className="text-3xl font-extrabold font-mono tabular-nums text-foreground tracking-tight">
        {isCurrency ? <Money amount={animated} /> : animated.toLocaleString()}
      </p>
    </div>
  );
}
