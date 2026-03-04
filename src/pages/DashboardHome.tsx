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
  User,
  Search,
  PackageOpen,
  ShoppingCart,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer, Money } from "@/components/shared";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { MmStatus } from "@/components/shared/MmLabel";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import PullToRefresh from "@/components/shared/PullToRefresh";

export default function DashboardHome() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
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

  const { convert, currency, symbol } = useCurrency();
  const balance = profile?.balance || 0;
  const convertedBalance = convert(balance);
  const displayBalance = useCountUp(convertedBalance, 800);

  // Stats
  const totalOrders = orders?.length || 0;
  const successOrders = orders?.filter((o: any) => o.status === "delivered" || o.status === "completed").length || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0;

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o: any) =>
      o.order_code?.toLowerCase().includes(q) ||
      o.product_name?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  return (
    <PageContainer>
      <PullToRefresh onRefresh={async () => {
        await Promise.all([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
        ]);
      }}>
        <div className="space-y-6">
          <PwaInstallBanner />

          {/* ═══ PAGE HEADER CARD — unified with Place Order / Orders ═══ */}
          <div className="page-header-card animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="page-header-icon">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1>Welcome back, <span className="text-primary">{profile?.name || "Reseller"}</span></h1>
                <p className="page-header-subtitle">Here's your business overview</p>
              </div>
            </div>
          </div>

          {/* ═══ 4 PREMIUM STAT CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Wallet Balance */}
            <div className="stat-card hover-lift group opacity-0 animate-stagger-in" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Wallet className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Balance</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight gold-shimmer">
                <Money amount={displayBalance} raw className="text-2xl sm:text-3xl" />
              </p>
              <button
                onClick={() => navigate("/dashboard/wallet")}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Funds
              </button>
            </div>

            {/* Total Orders */}
            <div className="stat-card hover-lift group opacity-0 animate-stagger-in" style={{ animationDelay: "0.08s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orders</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                {totalOrders.toLocaleString()}
              </p>
              <button
                onClick={() => navigate("/dashboard/orders")}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Success Rate */}
            <div className="stat-card hover-lift group opacity-0 animate-stagger-in" style={{ animationDelay: "0.16s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0 group-hover:bg-success/15 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Success</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                {successRate}%
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {successOrders} of {totalOrders} orders
              </p>
            </div>

            {/* Active Services */}
            <div className="stat-card hover-lift group opacity-0 animate-stagger-in" style={{ animationDelay: "0.24s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/15 transition-colors">
                  <Zap className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Services</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                Active
              </p>
              <button
                onClick={() => navigate("/dashboard/place-order")}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Place Order <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ═══ ORDER HISTORY TABLE ═══ */}
          <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="p-5 sm:p-6 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/60 border-border/50 h-9 text-sm"
                />
              </div>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-3.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground border-b border-border/30 bg-secondary/20">
              <span>Order ID</span>
              <span>Service</span>
              <span>Type</span>
              <span className="text-right">Amount</span>
              <span>Date</span>
              <span className="text-center">Status</span>
              <span className="text-center">Action</span>
            </div>

            {/* Table Body */}
            {ordersLoading ? (
              <div className="space-y-0 divide-y divide-border/20">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4">
                      <div className="h-4 w-20 bg-muted-foreground/10 rounded" />
                      <div className="h-4 w-32 bg-muted-foreground/10 rounded" />
                      <div className="h-4 w-16 bg-muted-foreground/10 rounded hidden md:block" />
                      <div className="h-4 w-20 bg-muted-foreground/10 rounded ml-auto" />
                      <div className="h-4 w-24 bg-muted-foreground/10 rounded hidden md:block" />
                      <div className="h-5 w-16 bg-muted-foreground/10 rounded-full mx-auto hidden md:block" />
                      <div className="h-4 w-10 bg-muted-foreground/10 rounded mx-auto hidden md:block" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                  <PackageOpen className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70 mb-1">No orders yet</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  {searchQuery ? "Try adjusting your search query." : "Place your first order to get started."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => navigate("/dashboard/place-order")}
                    className="mt-4 btn-glow px-5 py-2.5 text-sm"
                  >
                    Place Order
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filteredOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 px-5 md:px-6 py-3.5 md:py-4 hover:bg-primary/[0.03] transition-all cursor-pointer items-center group"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <span className="font-mono text-xs text-primary font-semibold truncate">
                      {order.order_code}
                    </span>
                    <span className="text-sm text-foreground truncate col-span-1">
                      {order.product_name}
                    </span>
                    <span className="text-xs text-muted-foreground hidden md:block capitalize">
                      {order.fulfillment_mode || "instant"}
                    </span>
                    <span className="text-sm font-mono font-semibold text-right tabular-nums">
                      <Money amount={order.price} className="inline" />
                    </span>
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {format(new Date(order.created_at), "MMM dd, yyyy")}
                    </span>
                    <span className="text-center hidden md:flex justify-center">
                      <MmStatus status={order.status} />
                    </span>
                    <span className="md:hidden flex items-center gap-2">
                      <MmStatus status={order.status} />
                      <span className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "MMM dd")}</span>
                    </span>
                    <span className="text-center hidden md:flex justify-center">
                      <Link
                        to={`/dashboard/orders/${order.id}`}
                        className="text-xs text-primary hover:underline font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}
