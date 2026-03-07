import { useEffect, useRef, useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Wallet, TrendingUp, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import PullToRefresh from "@/components/shared/PullToRefresh";
import HeroStats from "@/components/dashboard/HeroStats";
import PopularServices from "@/components/dashboard/PopularServices";
import ServiceCategories from "@/components/dashboard/ServiceCategories";
import RecentOrdersList from "@/components/dashboard/RecentOrdersList";

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

  // Orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-orders", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("orders")
        .select("*, products:product_id(image_url, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { convert } = useCurrency();
  const balance = profile?.balance || 0;
  const convertedBalance = convert(balance);
  const displayBalance = useCountUp(convertedBalance, 800);

  // Stats
  const totalOrders = orders?.length || 0;
  const todayOrders = orders?.filter((o: any) => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length || 0;
  const successOrders = orders?.filter((o: any) => o.status === "delivered" || o.status === "completed").length || 0;
  const processingOrders = orders?.filter((o: any) => ["processing", "pending", "pending_creation", "pending_review", "api_pending"].includes(o.status)).length || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0;

  const statsLoading = ordersLoading || !profile;

  return (
    <PageContainer>
      <PullToRefresh onRefresh={async () => {
        await Promise.all([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
          queryClient.invalidateQueries({ queryKey: ["popular-services-dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["service-categories-dashboard"] }),
        ]);
      }}>
        <div className="space-y-5 lg:space-y-8">

          {/* ═══ MOBILE GREETING ═══ */}
          <div className="lg:hidden animate-fade-in">
            <p className="text-muted-foreground text-xs font-medium">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight mt-0.5">
              {profile?.name || "Reseller"} 👋
            </h1>
          </div>

          {/* ═══ DESKTOP HEADER ═══ */}
          <div className="hidden lg:block page-header-card animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="page-header-icon">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1>Welcome back, <span className="gradient-text">{profile?.name || "Reseller"}</span></h1>
                  <p className="page-header-subtitle">Your digital unlock marketplace overview</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ QUICK SEARCH BAR (Mobile) ═══ */}
          <button
            onClick={() => navigate("/dashboard/place-order")}
            className="lg:hidden w-full flex items-center gap-3 px-4 py-3 rounded-card border border-border/50 bg-card text-muted-foreground text-sm animate-fade-in active:scale-[0.99] transition-transform"
          >
            <Search className="w-4 h-4 text-muted-foreground/60" />
            <span>Search IMEI service, iPhone unlock...</span>
          </button>

          {/* ═══ HERO STATS ═══ */}
          <HeroStats
            balance={displayBalance}
            totalOrders={totalOrders}
            todayOrders={todayOrders}
            successRate={successRate}
            processingOrders={processingOrders}
            loading={statsLoading}
            onWalletClick={() => navigate("/dashboard/wallet")}
          />

          {/* ═══ QUICK ACTIONS (Mobile) ═══ */}
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <button
              onClick={() => navigate("/dashboard/place-order")}
              className="flex items-center gap-3 p-4 rounded-card bg-primary/5 border border-primary/15 active:scale-[0.98] transition-transform group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Place Order</p>
                <p className="text-[10px] text-muted-foreground">Browse services</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/dashboard/wallet")}
              className="flex items-center gap-3 p-4 rounded-card bg-success/5 border border-success/15 active:scale-[0.98] transition-transform group"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0 group-hover:bg-success/15 transition-colors">
                <Plus className="w-5 h-5 text-success" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Add Funds</p>
                <p className="text-[10px] text-muted-foreground">Top up wallet</p>
              </div>
            </button>
          </div>

          {/* ═══ POPULAR SERVICES ═══ */}
          <PopularServices />

          {/* ═══ SERVICE CATEGORIES ═══ */}
          <ServiceCategories />

          {/* ═══ RECENT ORDERS ═══ */}
          <RecentOrdersList orders={orders} loading={ordersLoading} />
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}
