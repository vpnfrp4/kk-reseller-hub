import { useEffect, useRef } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FAST_QUERY_OPTIONS } from "@/lib/query-options";
import { useNavigate } from "react-router-dom";
import { t, useT } from "@/lib/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import PullToRefresh from "@/components/shared/PullToRefresh";
import HeroStats from "@/components/dashboard/HeroStats";
import ServiceCategories from "@/components/dashboard/ServiceCategories";
import PopularServices from "@/components/dashboard/PopularServices";
import RecentTimeline from "@/components/dashboard/RecentTimeline";
import { Money } from "@/components/shared";

export default function DashboardHome() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const navigate = useNavigate();
  const l = useT();
  const { formatAmount } = useCurrency();

  useEffect(() => { requestNotificationPermission(); }, []);

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

  // Most recent active order
  const recentActiveOrder = orders?.find((o: any) =>
    ["processing", "pending", "pending_creation", "pending_review", "api_pending"].includes(o.status)
  );

  return (
    <PullToRefresh onRefresh={async () => {
      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["popular-services-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["service-categories-dashboard"] }),
      ]);
    }}>
      <div className="grid gap-4">
        {/* ═══ PAGE HEAD ═══ */}
        <section className="cd-page-head cd-reveal">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {profile?.name || "Reseller"}</p>
          </div>
        </section>

        {/* ═══ STAT CARDS ═══ */}
        <HeroStats
          balance={displayBalance}
          totalOrders={totalOrders}
          todayOrders={todayOrders}
          successRate={successRate}
          processingOrders={processingOrders}
          loading={statsLoading}
          onWalletClick={() => navigate("/dashboard/wallet")}
        />

        {/* ═══ ACTIVE ORDER ═══ */}
        {recentActiveOrder && (
          <button
            onClick={() => navigate(`/dashboard/orders/${recentActiveOrder.id}`)}
            className="cd-card cd-reveal text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <strong className="text-[0.88rem] line-clamp-1">{recentActiveOrder.product_name}</strong>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5">Processing</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[0.88rem] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                  {formatAmount(recentActiveOrder.price)}
                </span>
                <p className="text-[0.7rem] text-muted-foreground mt-0.5">{recentActiveOrder.order_code}</p>
              </div>
            </div>
            <div className="cd-progress-track mt-3">
              <div className="cd-progress-fill" style={{ width: "45%" }} />
            </div>
          </button>
        )}

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div className="cd-section-grid">
          <PopularServices />
          <div className="grid gap-4">
            <ServiceCategories />
            <RecentTimeline orders={orders} loading={ordersLoading} />
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
