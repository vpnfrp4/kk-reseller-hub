import { useEffect, useRef } from "react";
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
  ArrowDownRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardHome() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const initialized = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("reseller-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
          refreshProfile();
          if (!initialized.current) return;
          if (payload.eventType === "UPDATE" && payload.new?.status === "approved" && payload.new?.type === "topup") {
            const msg = `Top-up of ${Number(payload.new.amount).toLocaleString()} MMK approved! 🎉`;
            toast.success(msg);
            notifyEvent("Top-up Approved", msg, "success");
          } else if (payload.eventType === "UPDATE" && payload.new?.status === "rejected") {
            toast.error("Your top-up request was rejected.");
            notifyEvent("Top-up Rejected", "Your top-up request was rejected.", "error");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
          refreshProfile();
          if (!initialized.current) return;
          const msg = `Order placed: ${payload.new?.product_name || "New order"} 🛒`;
          toast.success(msg);
          notifyEvent("Order Placed", msg, "success");
        }
      )
      .subscribe();

    setTimeout(() => { initialized.current = true; }, 2000);

    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient, refreshProfile]);


  const { data: transactions } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const stats = [
    {
      label: "Wallet Balance",
      value: `${(profile?.balance || 0).toLocaleString()} MMK`,
      icon: Wallet,
      change: "Available",
      positive: true,
    },
    {
      label: "Total Spent",
      value: `${(profile?.total_spent || 0).toLocaleString()} MMK`,
      icon: TrendingUp,
      change: "All time",
      positive: true,
    },
    {
      label: "Total Orders",
      value: (profile?.total_orders || 0).toString(),
      icon: ShoppingCart,
      change: "Completed",
      positive: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, <span className="text-primary glow-text">{profile?.name || "Reseller"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your reseller overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="flex items-center gap-1 text-xs text-success">
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <Link to="/dashboard/wallet" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(!transactions || transactions.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    tx.status === "approved" ? "bg-success/10 text-success" :
                    tx.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(!orders || orders.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
            ) : orders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{order.product_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.credentials}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-foreground">{order.price.toLocaleString()} MMK</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
