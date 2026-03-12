import { useEffect, useRef, useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FAST_QUERY_OPTIONS } from "@/lib/query-options";
import { Zap, Plus, Search, ArrowRight, Hand } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import PullToRefresh from "@/components/shared/PullToRefresh";
import HeroStats from "@/components/dashboard/HeroStats";
import PopularServices from "@/components/dashboard/PopularServices";
import RecentTimeline from "@/components/dashboard/RecentTimeline";
import { motion } from "framer-motion";

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
    ...FAST_QUERY_OPTIONS,
    refetchOnMount: true,
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
        <div className="space-y-5 lg:space-y-6">

          {/* ═══ MOBILE GREETING ═══ */}
          <motion.div
            className="lg:hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.12em]">Welcome back,</p>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight mt-0.5 flex items-center gap-2">
              {profile?.name || "Reseller"} <Hand className="w-5 h-5 text-primary" />
            </h1>
          </motion.div>

          {/* ═══ DESKTOP HEADER ═══ */}
          <motion.div
            className="hidden lg:block cd-page-head"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div>
              <h1>Welcome back, <span className="gradient-text">{profile?.name || "Reseller"}</span></h1>
              <p>Real-time overview of your reseller activities and performance.</p>
            </div>
            <div className="cd-page-head-actions">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/dashboard/place-order")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all shadow-lg shadow-primary/25"
              >
                <Zap className="w-4 h-4" />
                Place Order
              </motion.button>
            </div>
          </motion.div>

          {/* ═══ QUICK SEARCH BAR (Mobile) ═══ */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            onClick={() => navigate("/dashboard/place-order")}
            className="lg:hidden w-full flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-card)] border border-border/40 bg-card/80 backdrop-blur-sm text-muted-foreground text-sm active:scale-[0.99] transition-transform group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
              <Search className="w-4 h-4 text-primary/60" />
            </div>
            <span className="text-xs font-medium">Search IMEI service, iPhone unlock...</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/30" />
          </motion.button>

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

          {/* ═══ QUICK ACTIONS ═══ */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            {[
              { label: "Place Order", desc: "Browse services", icon: Zap, path: "/dashboard/place-order", color: "primary" },
              { label: "Add Funds", desc: "Top up wallet", icon: Plus, path: "/dashboard/wallet", color: "success" },
              { label: "My Orders", desc: "Track progress", icon: Search, path: "/dashboard/orders", color: "primary", desktopOnly: true },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 p-4 rounded-[var(--radius-card)] border border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 hover:shadow-[var(--shadow-elevated)] transition-all duration-300 text-left group ${action.desktopOnly ? "hidden lg:flex" : ""}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: `hsl(var(--${action.color}) / 0.1)` }}
                >
                  <action.icon className={`w-5 h-5 text-${action.color}`} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{action.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* ═══ SECTION GRID: Popular Services + Timeline ═══ */}
          <div className="cd-section-grid cd-reveal">
            <PopularServices />
            <RecentTimeline orders={orders} loading={ordersLoading} />
          </div>
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}
