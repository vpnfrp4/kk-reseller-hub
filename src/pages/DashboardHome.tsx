import { useEffect, useRef, useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FAST_QUERY_OPTIONS } from "@/lib/query-options";
import { Zap, Plus, Search, ArrowRight, Hand, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import PullToRefresh from "@/components/shared/PullToRefresh";
import HeroStats from "@/components/dashboard/HeroStats";
import ServiceCategories from "@/components/dashboard/ServiceCategories";
import PopularServices from "@/components/dashboard/PopularServices";
import RecentTimeline from "@/components/dashboard/RecentTimeline";
import RecentOrdersList from "@/components/dashboard/RecentOrdersList";
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

          {/* ═══ HERO STATS (BNPL balance card + mini stats) ═══ */}
          <HeroStats
            balance={displayBalance}
            totalOrders={totalOrders}
            todayOrders={todayOrders}
            successRate={successRate}
            processingOrders={processingOrders}
            loading={statsLoading}
            onWalletClick={() => navigate("/dashboard/wallet")}
          />

          {/* ═══ RECENT ORDER CARD (BNPL Overdue-style) ═══ */}
          {orders && orders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <RecentOrderCard order={orders[0]} onClick={() => navigate(`/dashboard/orders/${orders[0].id}`)} />
            </motion.div>
          )}

          {/* ═══ CATEGORIES (circular icons row like BNPL reference) ═══ */}
          <ServiceCategories />

          {/* ═══ POPULAR SERVICES (featured card style) ═══ */}
          <PopularServices />

          {/* ═══ RECENT ORDERS LIST ═══ */}
          <RecentOrdersList orders={orders} loading={ordersLoading} />
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}

/* ── BNPL-style Recent Order Card (like the "Adidas Store" card in reference) ── */
function RecentOrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const { formatAmount } = useCurrency();
  const statusLabel = order.status === "completed" || order.status === "delivered"
    ? "Completed"
    : order.status === "processing" || order.status === "api_pending"
    ? "Processing"
    : order.status === "failed" || order.status === "cancelled"
    ? "Failed"
    : "Pending";

  const statusColor = order.status === "completed" || order.status === "delivered"
    ? "bg-success"
    : order.status === "failed" || order.status === "cancelled"
    ? "bg-destructive"
    : "bg-primary";

  const progress = order.status === "completed" || order.status === "delivered" ? 100
    : order.status === "processing" || order.status === "api_pending" ? 60
    : order.status === "failed" || order.status === "cancelled" ? 100
    : 25;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border/30 bg-card p-4 text-left transition-all duration-200 hover:border-primary/20 active:scale-[0.99] group"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {order.product_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{statusLabel}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-extrabold font-mono tabular-nums text-foreground">
            {formatAmount(order.price)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
            {order.order_code}
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", statusColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
