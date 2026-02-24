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
import { t } from "@/lib/i18n";
import { MmStatus } from "@/components/shared/MmLabel";

const LOW_BALANCE_THRESHOLD = 20000;

export default function DashboardHome() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const navigate = useNavigate();
  const [topUpOpen, setTopUpOpen] = useState(false);

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
    { icon: Plus, mm: t.dashboard.addFunds.mm, en: t.dashboard.addFunds.en, onClick: () => setTopUpOpen(true), primary: true },
    { icon: Package, mm: t.dashboard.browseProducts.mm, en: t.dashboard.browseProducts.en, onClick: () => navigate("/dashboard/products") },
    { icon: ShoppingCart, mm: t.dashboard.viewOrders.mm, en: t.dashboard.viewOrders.en, onClick: () => navigate("/dashboard/orders") },
    { icon: Receipt, mm: t.dashboard.transactions.mm, en: t.dashboard.transactions.en, onClick: () => navigate("/dashboard/wallet") },
  ];

  return (
    <PageContainer>
      {/* WALLET HERO */}
      <div ref={heroRef} className="wallet-hero p-section animate-fade-in relative" style={{ transform: `translateY(${parallaxY * 0.3}px)`, transition: "transform 0.1s linear", padding: "32px", borderRadius: "var(--radius-modal)" }}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-card">
          <CrossFade isLoading={!profile} skeleton={<div className="space-y-3"><Skeleton className="h-4 w-32 rounded" /><Skeleton className="h-14 w-56 rounded" /><Skeleton className="h-4 w-44 rounded" /></div>}>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60 mb-micro">{t.dashboard.balance.en}</p>
              <p className="text-xs text-muted-foreground/80 mb-tight">{t.dashboard.balance.mm}</p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl lg:text-6xl font-extrabold font-mono tabular-nums text-foreground tracking-tighter leading-none">{displayBalance.toLocaleString()}</p>
                <span className="text-sm font-medium text-muted-foreground">MMK</span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-compact">
                {t.dashboard.approxPurchases.mm} <span className="font-semibold text-foreground">{approxPurchases}</span> {t.products.qty.mm}
              </p>
            </div>
          </CrossFade>

          {/* Sparkline */}
          <div className="hidden md:flex flex-col items-center gap-1 shrink-0">
            {sparklineData && sparklineData.length > 1 ? (
              <>
                <MiniSparkline data={sparklineData} width={120} height={40} color="hsl(var(--primary-glow))" className="opacity-80" />
                <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.dashboard.spending7d.mm}</span>
                <span className="text-[8px] text-muted-foreground/40">{t.dashboard.spending7d.en}</span>
              </>
            ) : (
              <div className="w-[120px] h-[40px] rounded bg-muted/10" />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-compact shrink-0">
            <button onClick={() => setTopUpOpen(true)} className="btn-glow px-card py-compact font-semibold text-sm flex items-center justify-center gap-tight">
              <Plus className="w-4 h-4" />
              {t.dashboard.addFunds.mm}
            </button>
            <Link to="/dashboard/wallet">
              <button className="btn-glass px-card py-compact font-semibold text-sm flex items-center justify-center gap-tight w-full">
                <Receipt className="w-4 h-4" />
                {t.dashboard.viewTransactions.mm}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-compact animate-fade-in" style={{ animationDelay: "0.08s" }}>
        {quickActions.map((action, i) => (
          <button key={action.en} onClick={action.onClick} className={cn("glass-card p-card flex flex-col items-center gap-compact text-center hover-lift group cursor-pointer", "opacity-0 animate-stagger-in")} style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-colors", action.primary ? "bg-primary/10 text-primary group-hover:bg-primary/20" : "bg-muted/50 text-muted-foreground group-hover:bg-muted")}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">{action.mm}</span>
            <span className="text-[9px] text-muted-foreground/60">{action.en}</span>
          </button>
        ))}
      </div>

      {/* WALLET HEALTH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-default animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <HealthCard mm={t.dashboard.spendingThisMonth.mm} en={t.dashboard.spendingThisMonth.en} value={walletHealth?.spendingThisMonth || 0} icon={TrendingUp} isCurrency />
        <HealthCard mm={t.dashboard.topups30d.mm} en={t.dashboard.topups30d.en} value={walletHealth?.totalTopups || 0} icon={Wallet} isCurrency />
        <HealthCard mm={t.dashboard.avgOrder.mm} en={t.dashboard.avgOrder.en} value={walletHealth?.avgOrderValue || 0} icon={ShoppingCart} isCurrency />
      </div>

      {/* LOW BALANCE */}
      {profile && isLowBalance && (
        <div className="glass-card border-warning/30 bg-warning/[0.04] p-card flex flex-col sm:flex-row sm:items-center justify-between gap-default animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-start gap-compact">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.dashboard.lowBalanceTitle.mm}</p>
              <p className="text-[10px] text-muted-foreground/60">{t.dashboard.lowBalanceTitle.en}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.lowBalanceMsg.mm}</p>
            </div>
          </div>
          <button onClick={() => setTopUpOpen(true)} className="btn-glow px-card py-compact text-sm font-semibold flex items-center gap-tight shrink-0">
            <Zap className="w-4 h-4" />
            {t.dashboard.quickTopUp.mm}
          </button>
        </div>
      )}

      {/* RECENT ACTIVITY */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between p-card border-b border-border/50">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t.dashboard.recentActivity.mm}</h3>
            <p className="text-[9px] text-muted-foreground/60">{t.dashboard.recentActivity.en}</p>
          </div>
          <div className="flex gap-compact">
            <Link to="/dashboard/wallet" className="text-xs text-primary hover:underline font-medium">{t.dashboard.allTransactions.mm}</Link>
            <span className="text-border">&middot;</span>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline font-medium">{t.dashboard.allOrders.mm}</Link>
          </div>
        </div>

        <CrossFade isLoading={txLoading && ordersLoading} skeleton={<div className="p-card space-y-0">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"><div className="space-y-1.5"><Skeleton className="h-4 w-40 rounded" /><Skeleton className="h-3 w-24 rounded" /></div><Skeleton className="h-5 w-24 rounded" /></div>))}</div>}>
          <div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-section text-center">{t.dashboard.noActivity.mm}</p>
            ) : (
              recentActivity.map((item, i) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between px-card py-3 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors opacity-0 animate-row-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center gap-compact min-w-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", item.amount > 0 ? "bg-success/10" : "bg-muted/40")}>
                      {item.type === "topup" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(item.date), "MMM dd, hh:mm a")}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-default">
                    <p className={cn("text-sm font-mono font-bold tabular-nums", item.amount > 0 ? "text-success" : "text-foreground")}>
                      {item.amount > 0 ? "+" : "\u2212"}{Math.abs(item.amount).toLocaleString()}
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

      <TopUpDialog userId={profile?.user_id} open={topUpOpen} onOpenChange={setTopUpOpen} hideTrigger onSubmitted={(id) => { setTopUpOpen(false); navigate(`/dashboard/topup-status/${id}`); }} />
    </PageContainer>
  );
}

/* Wallet Health Card */
function HealthCard({ mm, en, value, icon: Icon, isCurrency }: { mm: string; en: string; value: number; icon: React.ElementType; isCurrency?: boolean }) {
  const animated = useCountUp(value, 700);
  return (
    <div className="glass-card p-card space-y-compact">
      <div className="flex items-center gap-compact">
        <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block leading-tight">{mm}</span>
          <span className="text-[9px] text-muted-foreground/50">{en}</span>
        </div>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-foreground tracking-tight">
        {isCurrency ? <Money amount={animated} /> : animated.toLocaleString()}
      </p>
    </div>
  );
}
