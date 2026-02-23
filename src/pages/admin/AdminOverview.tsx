import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Package, KeyRound, Wallet, Users } from "lucide-react";

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, pendingTopups, resellers, credentials] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("product_credentials").select("id", { count: "exact", head: true }).eq("is_sold", false),
      ]);
      return {
        products: products.count || 0,
        pendingTopups: pendingTopups.count || 0,
        resellers: resellers.count || 0,
        availableCredentials: credentials.count || 0,
      };
    },
  });

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
    </div>
  );
}
