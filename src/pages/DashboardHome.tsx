import { useEffect, useRef, useMemo } from "react";
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
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

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

  // Spending chart data (last 30 days of purchases)
  const { data: spendingData } = useQuery({
    queryKey: ["spending-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("price, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Top-up chart data (last 30 days of approved top-ups)
  const { data: topupData } = useQuery({
    queryKey: ["topup-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("wallet_transactions")
        .select("amount, created_at")
        .eq("type", "topup")
        .eq("status", "approved")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const buildChartDays = (rawData: any[], valueKey: string) => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      days[format(subDays(new Date(), i), "MMM dd")] = 0;
    }
    (rawData || []).forEach((row: any) => {
      const key = format(new Date(row.created_at), "MMM dd");
      if (key in days) days[key] += Number(row[valueKey]);
    });
    return Object.entries(days).map(([date, amount]) => ({ date, amount }));
  };

  const chartData = useMemo(() => buildChartDays(spendingData, "price"), [spendingData]);
  const topupChartData = useMemo(() => buildChartDays(topupData, "amount"), [topupData]);

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Chart */}
        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h3 className="font-semibold text-foreground mb-4">Spending (Last 30 Days)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value.toLocaleString()} MMK`, "Spent"]}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#spendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-up Chart */}
        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h3 className="font-semibold text-foreground mb-4">Top-ups (Last 30 Days)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topupChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value.toLocaleString()} MMK`, "Deposited"]}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
