import { useEffect, useRef, useState, useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  ShoppingCart,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  PackageOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Money } from "@/components/shared";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { MmStatus } from "@/components/shared/MmLabel";
import { format } from "date-fns";
import PullToRefresh from "@/components/shared/PullToRefresh";

export default function DashboardHome() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const navigate = useNavigate();
  const l = useT();

  useEffect(() => { requestNotificationPermission(); }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("reseller-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
        refreshProfile();
        if (!initialized.current) return;
        if (payload.eventType === "UPDATE" && payload.new?.status === "approved" && payload.new?.type === "topup") {
          const msg = l(t.dashboard.topupApprovedToast).replace("{amount}", Number(payload.new.amount).toLocaleString());
          toast.success(msg);
          notifyEvent(l(t.dashboard.topupApprovedNotif), msg, "success");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
        refreshProfile();
        if (!initialized.current) return;
        const msg = l(t.dashboard.orderToast).replace("{name}", payload.new?.product_name || "New order");
        toast.success(msg);
      })
      .subscribe();
    setTimeout(() => { initialized.current = true; }, 2000);
    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient, refreshProfile, l]);

  // Orders for history
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { convert } = useCurrency();
  const balance = profile?.balance || 0;
  const convertedBalance = convert(balance);
  const displayBalance = useCountUp(convertedBalance, 800);

  // Stats
  const totalOrders = orders?.length || 0;
  const successOrders = orders?.filter((o: any) => o.status === "delivered" || o.status === "completed").length || 0;
  const processingOrders = orders?.filter((o: any) => ["processing", "pending", "pending_creation", "pending_review", "api_pending"].includes(o.status)).length || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0;

  // Today's orders
  const todayOrders = useMemo(() => {
    if (!orders) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((o: any) => new Date(o.created_at) >= today);
  }, [orders]);

  const statsLoading = ordersLoading || !profile;

  return (
    <PageContainer>
      <PullToRefresh onRefresh={async () => {
        await Promise.all([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
        ]);
      }}>
        <div className="space-y-4 lg:space-y-6">

          {/* ═══ MOBILE GREETING ═══ */}
          <div className="lg:hidden">
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight mt-0.5">
              {profile?.name || "Reseller"} 👋
            </h1>
          </div>

          {/* ═══ DESKTOP HEADER ═══ */}
          <div className="hidden lg:block page-header-card animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="page-header-icon">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1>Welcome back, <span className="gradient-text">{profile?.name || "Reseller"}</span></h1>
                <p className="page-header-subtitle">Here's your business overview</p>
              </div>
            </div>
          </div>

          {/* ═══ WALLET BALANCE CARD (Mobile-first hero) ═══ */}
          <div className="wallet-hero p-5 lg:hidden animate-fade-in">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet Balance</span>
              </div>
              {statsLoading ? (
                <div className="h-10 w-36 bg-muted-foreground/10 rounded-lg animate-pulse" />
              ) : (
                <p className="text-3xl font-extrabold font-mono tabular-nums tracking-tight gold-shimmer">
                  <Money amount={displayBalance} raw className="text-3xl" />
                </p>
              )}
              <button
                onClick={() => navigate("/dashboard/wallet")}
                className="mt-4 inline-flex items-center gap-2 btn-glow px-5 py-2.5 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Funds
              </button>
            </div>
          </div>

          {/* ═══ QUICK STATS GRID ═══ */}
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 lg:gap-4">
            {/* Desktop wallet card */}
            <div className="hidden lg:block stat-card hover-lift group opacity-0 animate-stagger-in" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Balance</span>
              </div>
              {statsLoading ? (
                <div className="h-8 w-28 bg-muted-foreground/10 rounded-lg animate-pulse" />
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight gold-shimmer">
                    <Money amount={displayBalance} raw className="text-2xl sm:text-3xl" />
                  </p>
                  <button onClick={() => navigate("/dashboard/wallet")} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Funds
                  </button>
                </>
              )}
            </div>

            {/* Today's Orders */}
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="mobile-stat-card group"
            >
              <div className="mobile-stat-icon bg-accent/10">
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-accent" strokeWidth={1.5} />
              </div>
              <div className="mt-2 lg:mt-4">
                {statsLoading ? (
                  <div className="h-7 w-10 bg-muted-foreground/10 rounded animate-pulse" />
                ) : (
                  <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums text-foreground">
                    {todayOrders.length}
                  </p>
                )}
                <p className="text-[10px] lg:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Today</p>
              </div>
            </button>

            {/* Success Rate */}
            <div className="mobile-stat-card">
              <div className="mobile-stat-icon bg-success/10">
                <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-success" strokeWidth={1.5} />
              </div>
              <div className="mt-2 lg:mt-4">
                {statsLoading ? (
                  <div className="h-7 w-12 bg-muted-foreground/10 rounded animate-pulse" />
                ) : (
                  <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums text-foreground">
                    {successRate}%
                  </p>
                )}
                <p className="text-[10px] lg:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Success</p>
              </div>
            </div>

            {/* Processing */}
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="mobile-stat-card group"
            >
              <div className="mobile-stat-icon bg-warning/10">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-warning" strokeWidth={1.5} />
              </div>
              <div className="mt-2 lg:mt-4">
                {statsLoading ? (
                  <div className="h-7 w-8 bg-muted-foreground/10 rounded animate-pulse" />
                ) : (
                  <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums text-foreground">
                    {processingOrders}
                  </p>
                )}
                <p className="text-[10px] lg:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Active</p>
              </div>
            </button>
          </div>

          {/* ═══ QUICK ACTIONS (Mobile) ═══ */}
          <div className="grid grid-cols-2 gap-2.5 lg:hidden">
            <button
              onClick={() => navigate("/dashboard/place-order")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Place Order</p>
                <p className="text-[10px] text-muted-foreground">Browse services</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/dashboard/wallet")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-success/5 border border-success/15 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Top Up</p>
                <p className="text-[10px] text-muted-foreground">Add funds</p>
              </div>
            </button>
          </div>

          {/* ═══ RECENT ORDERS ═══ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Recent Orders</h2>
              <button
                onClick={() => navigate("/dashboard/orders")}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-border/40 bg-card p-4 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 w-40 bg-muted-foreground/10 rounded" />
                      <div className="h-5 w-16 bg-muted-foreground/10 rounded-full" />
                    </div>
                    <div className="flex justify-between mt-3">
                      <div className="h-3 w-24 bg-muted-foreground/10 rounded" />
                      <div className="h-4 w-20 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/40 bg-card">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mb-3">
                  <PackageOpen className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70 mb-1">No orders yet</p>
                <p className="text-xs text-muted-foreground">Place your first order to get started</p>
                <button onClick={() => navigate("/dashboard/place-order")} className="mt-4 btn-glow px-5 py-2.5 text-sm">
                  Place Order
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 8).map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    className={cn(
                      "w-full text-left rounded-2xl border border-border/40 bg-card p-3.5 lg:p-4",
                      "active:scale-[0.99] transition-all duration-150",
                      "hover:border-primary/20 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {order.product_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {order.order_code}
                        </p>
                      </div>
                      <MmStatus status={order.status} />
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/20">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(order.created_at), "MMM dd, HH:mm")}
                      </span>
                      <Money amount={order.price} className="text-sm font-bold font-mono tabular-nums text-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}
