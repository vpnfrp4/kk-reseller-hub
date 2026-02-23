import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, KeyRound, Wallet, Users, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { notifyEvent, requestNotificationPermission } from "@/lib/notifications";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";

export default function AdminOverview() {
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-recent-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
          if (initialized.current) {
            const msg = `New order: ${payload.new?.product_name || "Unknown"} 🛒`;
            toast.info(msg);
            notifyEvent("New Order", msg, "info");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          if (initialized.current && payload.new?.type === "topup") {
            const msg = `New top-up request: ${Number(payload.new.amount).toLocaleString()} MMK 💰`;
            toast.info(msg);
            notifyEvent("New Top-up Request", msg, "info");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_credentials" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-cred-per-product"] });
        }
      )
      .subscribe();

    setTimeout(() => { initialized.current = true; }, 2000);

    return () => { supabase.removeChannel(channel); initialized.current = false; };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, pendingTopups, resellers, availableCreds, totalCreds] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }),
      ]);
      return {
        products: products.count || 0,
        pendingTopups: pendingTopups.count || 0,
        resellers: resellers.count || 0,
        availableCredentials: availableCreds.count || 0,
        totalCredentials: totalCreds.count || 0,
      };
    },
  });

  const { data: perProduct } = useQuery({
    queryKey: ["admin-cred-per-product"],
    queryFn: async () => {
      const [products, creds] = await Promise.all([
        supabase.from("products").select("id, name, icon"),
        supabase.from("product_credentials").select("product_id, is_sold"),
      ]);
      const counts: Record<string, { name: string; icon: string; available: number; sold: number }> = {};
      (products.data || []).forEach((p: any) => {
        counts[p.id] = { name: p.name, icon: p.icon, available: 0, sold: 0 };
      });
      (creds.data || []).forEach((c: any) => {
        if (counts[c.product_id]) {
          if (c.is_sold) counts[c.product_id].sold++;
          else counts[c.product_id].available++;
        }
      });
      return Object.values(counts).filter(p => p.available + p.sold > 0);
    },
  });

  const sold = (stats?.totalCredentials || 0) - (stats?.availableCredentials || 0);
  const total = stats?.totalCredentials || 0;
  const availablePct = total > 0 ? ((stats?.availableCredentials || 0) / total) * 100 : 0;

  const cards = [
    { label: "Products", value: stats?.products || 0, icon: Package, color: "text-primary" },
    { label: "Pending Top-ups", value: stats?.pendingTopups || 0, icon: Wallet, color: "text-warning" },
    { label: "Resellers", value: stats?.resellers || 0, icon: Users, color: "text-success" },
    { label: "Available Credentials", value: stats?.availableCredentials || 0, icon: KeyRound, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm">Manage your reseller platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={card.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-center gap-3 mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <AdminAnalyticsCharts />

      <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-lg font-semibold text-foreground mb-1">Credentials Overview</h2>
        <p className="text-sm text-muted-foreground mb-4">Available vs Sold across all products</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Available ({stats?.availableCredentials || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">Sold ({sold})</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto font-mono">{total} total</span>
        </div>

        <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${availablePct}%` }}
          />
        </div>

        <div className="space-y-3">
          {(perProduct || []).map((p) => {
            const pTotal = p.available + p.sold;
            const pAvailPct = pTotal > 0 ? (p.available / pTotal) * 100 : 0;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">{p.icon}</span>
                <span className="text-sm text-foreground font-medium min-w-[120px]">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{ width: `${pAvailPct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground min-w-[60px] text-right">
                  {p.available}/{pTotal}
                </span>
              </div>
            );
          })}
          {(!perProduct || perProduct.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No credentials added yet</p>
          )}
        </div>
      </div>

      <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <p className="text-sm text-muted-foreground">Latest purchases across all resellers</p>
          </div>
        </div>
        <RecentOrdersFeed />
      </div>
    </div>
  );
}

function RecentOrdersFeed() {
  const { data: orders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, price, created_at, user_id, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return data.map((o: any) => ({ ...o, profile: profileMap[o.user_id] || null }));
    },
  });

  if (!orders || orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No orders yet</p>;
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-2">
      {orders.map((o: any) => (
        <div key={o.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {(o.profile?.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {o.profile?.name || o.profile?.email || "Unknown user"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-mono font-semibold text-foreground">{o.price.toLocaleString()} MMK</p>
            <p className="text-[10px] text-muted-foreground">{timeAgo(o.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
