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
  Mail,
  Calendar,
  Search,
  Receipt,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer, Money } from "@/components/shared";

import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { MmStatus } from "@/components/shared/MmLabel";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

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

  const balance = profile?.balance || 0;
  const displayBalance = useCountUp(balance, 800);
  // Use user metadata created_at or fallback
  const memberSince = user?.created_at ? format(new Date(user.created_at), "MMM dd, yyyy") : "—";

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
      <PwaInstallBanner />

      {/* USER PROFILE CARD */}
      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-border/30">
          <h2 className="text-lg font-bold text-foreground">User Profile</h2>
        </div>

        {/* Balance Section */}
        <div className="p-6">
          <div className="balance-card flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2">
                ACCOUNT BALANCE
              </p>
              <p className="text-4xl font-extrabold font-mono tabular-nums tracking-tight gold-shimmer">
                {displayBalance.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">MMK</p>
            </div>
            <button
              onClick={() => navigate("/dashboard/wallet")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-btn)] font-semibold text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, #FFC107, #FFD54F)",
                color: "#0B0E14",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Fund
            </button>
          </div>
        </div>

        {/* User Info Grid */}
        <div className="px-6 pb-6 space-y-0">
          <ProfileRow icon={User} label="Username" value={profile?.name || "—"} />
          <ProfileRow icon={Mail} label="Email" value={profile?.email || "—"} />
          <ProfileRow icon={Calendar} label="Member Since" value={memberSince} />
        </div>
      </div>

      {/* ORDER HISTORY */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="p-6 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">Order History</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border h-9 text-sm"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border/30 bg-secondary/30">
          <span>Order ID</span>
          <span>Service</span>
          <span>Order</span>
          <span className="text-right">Amount</span>
          <span>Date</span>
          <span className="text-center">Status</span>
          <span className="text-center">Action</span>
        </div>

        {/* Table Body */}
        {ordersLoading ? (
          <div className="space-y-0 divide-y divide-border/30">
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Receipt className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredOrders.map((order: any) => (
              <div
                key={order.id}
                className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
              >
                <span className="font-mono text-xs text-primary font-medium truncate">
                  {order.order_code}
                </span>
                <span className="text-sm text-foreground truncate col-span-1">
                  {order.product_name}
                </span>
                <span className="text-xs text-muted-foreground hidden md:block">
                  {order.fulfillment_mode || "instant"}
                </span>
                <span className="text-sm font-mono font-semibold text-right">
                  <Money amount={order.price} className="inline" />
                </span>
                <span className="text-xs text-muted-foreground hidden md:block">
                  {format(new Date(order.created_at), "MMM dd, yyyy")}
                </span>
                <span className="text-center hidden md:block">
                  <MmStatus status={order.status} />
                </span>
                {/* Mobile: show status + date inline */}
                <span className="md:hidden flex items-center gap-2">
                  <MmStatus status={order.status} />
                  <span className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "MMM dd")}</span>
                </span>
                <span className="text-center hidden md:block">
                  <Link
                    to={`/dashboard/orders/${order.id}`}
                    className="text-xs text-primary hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </PageContainer>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
